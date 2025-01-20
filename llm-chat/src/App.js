import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Chat and UI states
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Models
  const [modelOptions, setModelOptions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  
  // Chat states
  const [chatList, setChatList] = useState([]);  // array of filenames or IDs
  const [selectedChat, setSelectedChat] = useState(''); // user-chosen file/ID


  // On mount, fetch /api/models
  useEffect(() => {
    fetch('http://localhost:8080/api/models')
      .then(res => res.json())
      .then(data => {
        const models = data.models || [];
        setModelOptions(models);
        // optionally set the first model
        if (models.length > 0) {
          setSelectedModel(models[0]);
          // also call setActiveModel if you'd like to initialize the server's model
          setActiveModel(models[0]);
        }
      })
      .catch(err => console.error('Error fetching models:', err));
  }, []);
  
  // On mount, fetch chat list
  useEffect(() => {
    fetch('http://localhost:8080/api/chats')
      .then((res) => res.json())
      .then((data) => {
        // data.chats might be ["chat_123.json", "chat_abc.json"]
        setChatList(data.chats || []);
      })
      .catch((err) => console.error("Error fetching chat list:", err));
  }, []);
  
  // Create new chat
    const createNewChat = async () => {
      // Prompt user for chat name
      const chatName = window.prompt("Enter a name for your new chat:");
      if (!chatName) return;

      try {
        // POST to /api/chats
        const res = await fetch("http://localhost:8080/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: chatName })
        });
        if (!res.ok) {
          const errorData = await res.json();
          alert("Error creating chat: " + (errorData.detail || res.status));
          return;
        }
        const data = await res.json();
        if (data.chat_id) {
          // data.chat_id e.g. "MyChat.json"
          setChatList(prev => [...prev, data.chat_id]);
          setSelectedChat(data.chat_id);
          setMessages([]); // start fresh
        }
      } catch (err) {
        console.error("Error creating new chat:", err);
      }
    };
  
  // Whenever selectedChat changes, load the chat's messages
  useEffect(() => {
      if (!selectedChat) {
        setSelectedChat('None');
      }
      
    fetch(`http://localhost:8080/api/chats/${selectedChat}`)
      .then(res => res.json())
      .then(data => {
        // data.messages => e.g. [{ role: "user", content: "Hi" }, ...]
        const transformed = (data.messages || []).map(m => {
          return {
            sender: m.role === 'assistant' ? 'bot' : 'user',
            text: m.content
          };
        });
        setMessages(transformed);
      })
      .catch(err => {
        console.error("Error loading chat messages:", err);
        setMessages([]);
      });
  }, [selectedChat]);

  // Toggle Dark Mode
  useEffect(() => {
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference) {
      setIsDarkMode(JSON.parse(darkModePreference));
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode));
  };

  // Call /api/set_model to change the server's active model
  const setActiveModel = async (modelName) => {
    try {
      const resp = await fetch('http://localhost:8080/api/set_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      if (!resp.ok) {
        const errData = await resp.json();
        alert(`Error setting model: ${errData.detail}`);
      } else {
        console.log(`Active model set to ${modelName}`);
      }
    } catch (err) {
      console.error('Error setting model on server:', err);
    }
  };

  // When user selects a different model
  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    // Now notify the server
    await setActiveModel(newModel);
  };

  // SSE logic
  const sendMessage = () => {
    const trimmed = userMessage.trim();
    if (!trimmed) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setUserMessage('');
    setLoading(true);

    // SSE endpoint
    const url = `http://localhost:8080/api/chat/stream?message=${encodeURIComponent(trimmed)}`;
    const source = new EventSource(url);

    let botIndex = null;
    // Insert a placeholder for the streaming bot message
    setMessages(prev => {
      const updated = [...prev];
      botIndex = updated.length;
      updated.push({ sender: 'bot', text: '' });
      return updated;
    });

    source.onopen = () => {
      console.log('SSE connection open');
      // We'll wait for the first chunk to hide spinner
    };

    source.onmessage = (event) => {
      setLoading(false); // first chunk => hide spinner
      let chunk = event.data;

      if (chunk === '[DONE]') {
        source.close();
        return;
      }
      if (chunk.startsWith('[ERROR]')) {
        console.error(chunk);
        source.close();
        return;
      }
      
      chunk = chunk.replace(/\\n/g, '\n');

      // Append chunk to the last bot message
      setMessages(prev => {
        const updated = [...prev];
        updated[botIndex] = {
          ...updated[botIndex],
          text: updated[botIndex].text + chunk
        };
        return updated;
      });
    };

    source.onerror = (err) => {
      console.error('SSE error:', err);
      source.close();
      setLoading(false);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'An error occurred while streaming.'
      }]);
    };
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  // On Enter vs Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="App-header">
        <h1>Local LLM Chat</h1>
        <div className="header-actions">
          <div>
            <label>Model: </label>
            <select value={selectedModel} onChange={handleModelChange}>
              {modelOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button onClick={toggleDarkMode}>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>
      
      <div className="controls">
        <div className="chat-selector">
          <label>Select Chat: </label>
            <select
              value={selectedChat}
              onChange={(e) => {
                setSelectedChat(e.target.value);
              }}
            >
              <option value="">--None--</option>
              {chatList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={createNewChat}>New Chat</button>
        </div>
      </div>

      <div className="chat-window">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.sender} ${isDarkMode ? 'dark-mode' : ''}`}
          >
            {message.text}
          </div>
        ))}
        {loading && (
          <div className={`loading ${isDarkMode ? 'dark-mode' : ''}`}>
            <span>Preparing response...</span>
          </div>
        )}
      </div>

      <form
        className={`chat-form ${isDarkMode ? 'dark-mode' : ''}`}
        onSubmit={handleSubmit}
      >
        <textarea
          rows={6}
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Type your message here..."
          className="chat-input"
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
}

export default App;
