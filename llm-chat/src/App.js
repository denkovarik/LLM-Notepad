import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import './App.css';

/** Resizer for adjusting user-input container height */
function Resizer({ height, setHeight, isDarkMode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  // Use callbacks + dependencies to avoid ESLint warnings
  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY;
    let newHeight = parseFloat(height) + deltaY;

    // min & max
    newHeight = Math.max(newHeight, 60);
    newHeight = Math.min(newHeight, window.innerHeight - 150);

    setHeight(`${newHeight}px`);
    setStartY(e.clientY);
  }, [isDragging, startY, height, setHeight]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  // Attach/detach listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  return (
    <div
      className={`resizer ${isDragging ? 'dragging' : ''} ${isDarkMode ? 'dark-mode' : ''}`}
      onMouseDown={onMouseDown}
      aria-label="Resize input field"
    />
  );
}

export default function App() {
  // Chat + UI states
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Models
  const [modelOptions, setModelOptions] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Chats
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState('');

  // The resizable user input area
  const [userInputHeight, setUserInputHeight] = useState('150px');

  // For auto-scrolling in the chat window
  const chatWindowRef = useRef(null);

  // Instead of hiding the header, we collapse it to a minimal bar
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  /* 1) Fetch models once on mount */
  useEffect(() => {
    fetch('http://localhost:8080/api/models')
      .then((res) => res.json())
      .then((data) => {
        const models = data.models || [];
        setModelOptions(models);
        if (models.length > 0) {
          setSelectedModel(models[0]);
          setActiveModel(models[0]);
        }
      })
      .catch((err) => console.error('Error fetching models:', err));
  }, []);

  /* 2) Fetch chats on mount */
  useEffect(() => {
    fetch('http://localhost:8080/api/chats')
      .then((res) => res.json())
      .then((data) => {
        setChatList(data.chats || []);
      })
      .catch((err) => console.error('Error fetching chat list:', err));
  }, []);

  /* 3) Create new chat */
  const createNewChat = async () => {
    const chatName = window.prompt("Enter a name for your new chat:");
    if (!chatName) return;

    try {
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
        // Add new chat to the list, select it
        setChatList((prev) => [...prev, data.chat_id]);
        setSelectedChat(data.chat_id);
        setMessages([]); // brand new => empty
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  };

  /* 4) Load messages whenever selectedChat changes */
  useEffect(() => {
    const chat_id = selectedChat || 'None';
    fetch(`http://localhost:8080/api/chats/${chat_id}`)
      .then((res) => res.json())
      .then((data) => {
        const transformed = (data.messages || []).map((m) => ({
          sender: m.role === 'assistant' ? 'bot' : 'user',
          text: m.content
        }));
        setMessages(transformed);
      })
      .catch((err) => {
        console.error("Error loading chat messages:", err);
        setMessages([]);
      });
  }, [selectedChat]);

  /* 5) Load dark mode preference */
  useEffect(() => {
    const darkModePref = localStorage.getItem('darkMode');
    if (darkModePref) {
      setIsDarkMode(JSON.parse(darkModePref));
    }
  }, []);

  /* 6) Toggle dark mode */
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode));
  };

  /* 7) Switch to new model on server */
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

  /* 8) On model change */
  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    await setActiveModel(newModel);
  };

  /* 9) SSE: send message */
  function sendMessage() {
    const trimmed = userMessage.trim();
    if (!trimmed) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: trimmed }]);
    setUserMessage('');
    setLoading(true);

    const url = `http://localhost:8080/api/chat/stream?message=${encodeURIComponent(trimmed)}`;
    const source = new EventSource(url);

    let botIndex = null;
    // Insert placeholder for bot
    setMessages(prev => {
      const updated = [...prev];
      botIndex = updated.length;
      updated.push({ sender: 'bot', text: '' });
      return updated;
    });

    source.onopen = () => {
      console.log('SSE connection open');
    };

    source.onmessage = (event) => {
      console.log('onmessage =>', event.data);
      setLoading(false);

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

      // Replace escaped newlines
      chunk = chunk.replace(/\\n/g, '\n');

      setMessages(prev => {
        const updated = [...prev];
        updated[botIndex].text += chunk;
        return updated;
      });
    };

    source.onerror = (err) => {
      console.error('SSE error:', err);
      source.close();
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'An error occurred while streaming.' }
      ]);
    };
  }

  /* 10) Submit form */
  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  /* 11) SHIFT+Enter vs Enter */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  /* 12) Scroll chat to bottom on new messages */
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Collapsing the header to a minimal bar
  const toggleHeader = () => {
    setHeaderCollapsed(prev => !prev);
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* We always render the header, 
          but apply .collapsed if headerCollapsed = true */}
      <header className={`App-header ${headerCollapsed ? 'collapsed' : ''}`}>
        {headerCollapsed ? (
          /* Minimal bar when collapsed: show a single button to expand again */
          <div className="collapsed-header-bar">
            <button onClick={toggleHeader} className="header-toggle-button">
              Expand Header
            </button>
          </div>
        ) : (
          /* Full expanded header content */
          <>
            <h1>LLM Notepad</h1>
            <div className="header-actions">
              <div>
                <label>Model: </label>
                <select value={selectedModel} onChange={handleModelChange}>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="header-right">
                <button onClick={toggleDarkMode} className="dark-mode-button">
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </div>

            <div className="controls">
              <div className="chat-selector">
                <label>Select Chat: </label>
                <select
                  value={selectedChat}
                  onChange={(e) => setSelectedChat(e.target.value)}
                >
                  <option value="">--None--</option>
                  {chatList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button onClick={createNewChat}>New Chat</button>
              </div>
            </div>

            {/* The "Collapse Header" button in bottom-right corner of expanded header */}
            <div className="hide-header-container">
              <button onClick={toggleHeader} className="header-toggle-button">
                Collapse Header
              </button>
            </div>
          </>
        )}
      </header>

      <div className="chat-container" style={{ marginBottom: userInputHeight }}>
        <div className="chat-window" ref={chatWindowRef}>
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
      </div>

      <div className="user-input-container" style={{ height: userInputHeight }}>
        <Resizer height={userInputHeight} setHeight={setUserInputHeight} isDarkMode={isDarkMode} />

        <form className={`chat-form ${isDarkMode ? 'dark-mode' : ''}`} onSubmit={handleSubmit}>
          {/* 
            For inverting colors in dark mode, 
            ensure we have .chat-input.dark-mode in our CSS:
              background-color: #111; 
              color: #eee;
          */}
          <textarea
            style={{ height: 'calc(100% - 10px)', width: '100%' }}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Type your message..."
            className={`chat-input ${isDarkMode ? 'dark-mode' : ''}`}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
