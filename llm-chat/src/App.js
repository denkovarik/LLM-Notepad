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
      const chunk = event.data;

      if (chunk === '[DONE]') {
        source.close();
        return;
      }
      if (chunk.startsWith('[ERROR]')) {
        console.error(chunk);
        source.close();
        return;
      }

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
          rows={3}
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
