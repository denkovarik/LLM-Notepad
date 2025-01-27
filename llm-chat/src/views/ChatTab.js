import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import ChatWindow from '../components/ChatWindow';
import UserInput from '../components/UserInput';
import '../App.css';


function ChatTab({ messages, loading, isDarkMode, userInputHeight, chatWindowRef, userMessage, setUserMessage, setUserInputHeight, setMessages, setLoading }) {
  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, chatWindowRef]);
  
  /* SSE: send message */
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

  return (
    <div className="chat-container" style={{ marginBottom: userInputHeight }}>
      <ChatWindow 
        messages={messages} 
        setMessages={setMessages}
        userMessage={userMessage}
        setUserMessage={setUserMessage}
        isDarkMode={isDarkMode} 
        chatWindowRef={chatWindowRef}
        loading={loading}
        setLoading={setLoading}
      />

      <UserInput
        userInputHeight={userInputHeight}
        setUserInputHeight={setUserInputHeight}
        isDarkMode={isDarkMode}
        userMessage={userMessage}
        setUserMessage={setUserMessage}
        handleSubmit={handleSubmit}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
}

ChatTab.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.shape({
    sender: PropTypes.oneOf(['user', 'bot']).isRequired,
    text: PropTypes.string.isRequired
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  userInputHeight: PropTypes.string.isRequired,
  chatWindowRef: PropTypes.object.isRequired,
  userMessage: PropTypes.string.isRequired,
  setUserMessage: PropTypes.func.isRequired,
  setUserInputHeight: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  sendMessage: PropTypes.func.isRequired,
};

export default ChatTab;