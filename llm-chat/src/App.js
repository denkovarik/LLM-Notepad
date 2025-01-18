import React, { useState, useEffect } from 'react';
import './App.css'; // Optional styling

function App() {
  // Local state
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode preference on mount
  useEffect(() => {
    const darkModePreference = localStorage.getItem('darkMode');
    if (darkModePreference) {
      setIsDarkMode(JSON.parse(darkModePreference));
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(!isDarkMode));
  };

  // This function handles sending the message to the server via SSE
  const sendMessage = () => {
    const trimmed = userMessage.trim();
    if (!trimmed) return;

    // Add user's message to the chat
    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setUserMessage(''); // Clear the textarea

    // Show spinner
    setLoading(true);

    // Construct SSE URL with the user’s prompt
    const url = `http://localhost:8080/api/chat/stream?message=${encodeURIComponent(trimmed)}`;

    // Create an EventSource
    const source = new EventSource(url);

    // We'll insert a placeholder bot message to update with streaming text
    let botIndex = null;

    // Insert a new "bot" message so we can update partial text
    setMessages((prev) => {
      const updated = [...prev];
      botIndex = updated.length;
      updated.push({ sender: 'bot', text: '', streaming: true });
      return updated;
    });

    // SSE event handlers
    source.onopen = () => {
      // SSE connection opened
      // We'll wait for the first chunk to setLoading(false)
    };

    source.onmessage = (event) => {
      // First chunk => hide spinner
      setLoading(false);
      // If we see [DONE], close the stream gracefully
      if (event.data === "[DONE]") {
        source.close();
        setLoading(false);
        return;
      }
      const chunk = event.data; // partial text chunk
      setMessages((prev) => {
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

      // Optionally, let user know an error occurred
      setMessages((prev) => [...prev, {
        sender: 'bot',
        text: 'An error occurred while streaming.'
      }]);
    };
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  // Handle keypresses in the textarea
  // If user hits Enter (no shift), send message
  // If user hits Shift+Enter, allow newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();  // prevent newline
      sendMessage();
    }
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header with dark mode toggle */}
      <header className="App-header">
        <h1>Local LLM Chat</h1>
        <button onClick={toggleDarkMode}>
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      {/* Chat Window */}
      <div className="chat-window">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.sender} ${isDarkMode ? 'dark-mode' : ''}`}
          >
            <span>{message.sender === 'user' ? 'You' : 'Bot'}: </span>
            {message.text}
          </div>
        ))}
        {/* Loading Spinner */}
        {loading && (
          <div className={`loading ${isDarkMode ? 'dark-mode' : ''}`}>
            <span>Preparing response...</span>
          </div>
        )}
      </div>

      {/* Form / Textarea */}
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
        ></textarea>
        <button type="submit" className="send-button">Send</button>
      </form>
    </div>
  );
}

export default App;
