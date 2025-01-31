import React, { useEffect } from 'react';

const ChatWindow = ({ messages, setMessages, userMessage, setUserMessage, isDarkMode, chatWindowRef, loading, setLoading }) => {   
  
  return (
    <div className={`chat-window ${isDarkMode ? 'dark-mode' : ''}`} ref={chatWindowRef}>
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
  );
};

export default ChatWindow;