import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import './App.css';
import ChatTab from './views/ChatTab'; 
import OptionsTab from './views/OptionsTab';
import { useDarkMode } from './hooks/useDarkMode';


export default function App() {
  // Chat + UI states
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();
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
  // Tabs
  const [activeTab, setActiveTab] = useState('chat');

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
      <div className="tabs">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={activeTab === 'chat' ? 'active' : ''}
        >
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('options')} 
          className={activeTab === 'options' ? 'active' : ''}
        >
          Options
        </button>
      </div>
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
      
      {activeTab === 'chat' ? (
        <ChatTab 
          messages={messages} 
          loading={loading} 
          isDarkMode={isDarkMode}
          userInputHeight={userInputHeight}
          chatWindowRef={chatWindowRef}
          userMessage={userMessage}
          setUserMessage={setUserMessage}
          setUserInputHeight={setUserInputHeight}
          setMessages={setMessages}
          setLoading={setLoading}
        />
      ) : (
        <OptionsTab 
          // pass props if needed
        />
      )}
    </div>
  );
}
