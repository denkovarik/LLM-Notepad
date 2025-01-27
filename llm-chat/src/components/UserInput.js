import React from 'react';
import PropTypes from 'prop-types';
import Resizer from './Resizer';

function UserInput({ userInputHeight, setUserInputHeight, isDarkMode, userMessage, setUserMessage, handleSubmit, handleKeyDown }) {
  return (
      <div className={`user-input-container ${isDarkMode ? 'dark-mode' : ''}`} style={{ height: userInputHeight }}>
        <Resizer height={userInputHeight} setHeight={setUserInputHeight} isDarkMode={isDarkMode} />

        <form className={`chat-form ${isDarkMode ? 'dark-mode' : ''}`} onSubmit={handleSubmit}>
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
  );
}

UserInput.propTypes = {
  userInputHeight: PropTypes.string.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  userMessage: PropTypes.string.isRequired,
  setUserMessage: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
};

export default UserInput;