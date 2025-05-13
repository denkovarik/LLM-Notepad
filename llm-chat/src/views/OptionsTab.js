import React, { useState, useEffect } from 'react';

function OptionsTab() {
  const [summarizeHistory, setSummarizeHistory] = useState(false);
  const [summaryModel, setSummaryModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxMessagesToFeed, setMaxMessagesToFeed] = useState(0);
  const [lightRAGEnabled, setLightRAGEnabled] =useState(false);
  const [lightRAGLLMModel, setLightRAGLLMModel] = useState('');
  const [lightRAGEmbedModel, setLightRAGEmbedModel] = useState('');
  const [initializing, setInitializing] = useState(false);

  // Fetch settings from the server when component mounts or when active tab changes to OptionsTab
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8080/api/models').then(res => res.json()),
      fetch('http://localhost:8080/api/get_settings').then(res => res.json())
    ])
    .then(([modelsData, settingsData]) => {        
      setAvailableModels(modelsData.models || []);
      setSummarizeHistory(settingsData.summarizeHistory || false);
      setLightRAGEnabled(settingsData.lightRAGEnabled || false);
      setSummaryModel(settingsData.summaryModel || '');
      setMaxMessagesToFeed(settingsData.maxMessagesToFeed || 0);
      setLightRAGLLMModel(settingsData.lightRAGLLMModel || undefined);
      setLightRAGEmbedModel(settingsData.lightRAGEmbedModel || undefined);
      setLoading(false);
    })
    .catch(err => {
      setError('Error fetching settings or models.');
      setLoading(false);
    });
  }, []);

  // Chat History Summarization
  const handleSummarizeToggle = (e) => {
    const isChecked = e.target.checked;
    
    setSummarizeHistory(isChecked);
    fetch('http://localhost:8080/api/set_summarization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summarizeHistory: isChecked })
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error setting summarization:', error));
    
    if (!isChecked) {
      setSummaryModel(''); // Clear the selected model when disabling summarization
      fetch('http://localhost:8080/api/disable_summarization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => response.json())
      .then(data => console.log(data))
      .catch(error => console.error('Error disabling summarization:', error));
    }
  };

  const handleModelChange = (e) => {
    setSummaryModel(e.target.value);
    setError(null); // Clear error message when user selects a model
    fetch('http://localhost:8080/api/set_summarization_model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: e.target.value })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to set summarization model.');
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      setError(`Error setting summarization model: ${error.message}`);
    });
  };
  
  const handleMaxMessagesChange = (e) => {
    const value = parseInt(e.target.value, 10) || 0; // Ensure the value is an integer
    setMaxMessagesToFeed(value);
    fetch('http://localhost:8080/api/set_max_messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxMessages: value })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to set max messages.');
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      setError(`Error setting max messages: ${error.message}`);
    });
  };
  
  const setLightRAGLLMModelServer = async (model) => {
    try {
      const response = await fetch('http://localhost:8080/api/set_lightRAG_llm_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });

      if (!response.ok) {
        throw new Error('Failed to set light RAG llm model.');
      }

      const data = await response.json();
      console.log('Light RAG LLM model set successfully:', data);
      return data;
    } catch (error) {
      console.error(`Error setting light RAG llm model: ${error.message}`);
      throw error; // Re-throw the error for the caller to handle if necessary
    }
  };
  
  const setLightRAGEmbedModelServer = async (model) => {
    try {
      const response = await fetch('http://localhost:8080/api/set_lightRAG_embed_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });

      if (!response.ok) {
        throw new Error('Failed to set light RAG embed model.');
      }

      const data = await response.json();
      console.log('Light RAG Embed model set successfully:', data);
      return data;
    } catch (error) {
      console.error(`Error setting light RAG Embed model: ${error.message}`);
      throw error; // Re-throw the error for the caller to handle if necessary
    }
  };
  
  // Light RAG
  const handleLightRAGToggle = (e) => {
    const isChecked = e.target.checked;
  
    setLightRAGEnabled(isChecked);
    
    fetch('http://localhost:8080/api/set_light_rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lightRAGEnabled: isChecked })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to set Light RAG.');
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      setError(`Error setting Light RAG: ${error.message}`);
      // Revert the state if the server call fails
      setLightRAGEnabled(!isChecked);
    });
  
    setLightRAGLLMModel(lightRAGLLMModel);
    
    if(lightRAGLLMModel !== undefined) {
      try {
        const responseData = setLightRAGLLMModelServer(lightRAGLLMModel);
      } catch (error) {
        setError(`Error setting light RAG llm model: ${error.message}`);
      }
    }
    
    if(lightRAGEmbedModel !== undefined) {
      try {
        const responseData = setLightRAGEmbedModelServer(lightRAGEmbedModel);
      } catch (error) {
        setError(`Error setting light RAG embed model: ${error.message}`);
      }
    }
  };
  
  const handleLightRAGLLMModelChange = (e) => {
    setLightRAGLLMModel(e.target.value);
    setError(null); // Clear error message when user selects a model
    
    try {
      const responseData = setLightRAGLLMModelServer(e.target.value);
    } catch (error) {
      setError(`Error setting light RAG llm model: ${error.message}`);
    }
  };
  
  const handleLightRAGEmbedModelChange = (e) => {
    setLightRAGEmbedModel(e.target.value);
    setError(null); // Clear error message when user selects a model
    fetch('http://localhost:8080/api/set_lightRAG_embed_model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: e.target.value })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to set light RAG llm model.');
      }
      return response.json();
    })
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      setError(`Error setting light RAG embed model: ${error.message}`);
    });
  };
  
  const handleInitialize = () => {
    if (lightRAGEnabled) {
      setInitializing(true);
      fetch('http://localhost:8080/api/initialize_light_rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to initialize Light RAG.');
        }
        return response.json();
      })
      .then(data => {
        console.log('Light RAG initialized:', data);
        setInitializing(false);
      })
      .catch(error => {
        console.error(`Error initializing Light RAG: ${error.message}`);
        setInitializing(false);
        setError(`Error initializing Light RAG: ${error.message}`);
      });
    }
  };

  return (
    <div className="options-container" style={{ textAlign: 'left' }}>
      <h2>Options</h2>   
      
      <section className="chat-history-options">
        <h3>Chat History Summarization</h3>
        <div>
          <label>
            <input 
              type="checkbox" 
              checked={summarizeHistory}
              onChange={handleSummarizeToggle}
            />
            Enable Chat History Summarization
          </label>
        </div>
        <div>
          <label>Summarization Model: </label>
          {loading ? (
            <span>Loading...</span>
          ) : (
            <select 
              value={summaryModel} 
              onChange={handleModelChange}
              disabled={!summarizeHistory}
            >
              <option value="">--Please choose a model--</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label>Max Messages to Feed to LLM: </label>
          <input 
            type="number"
            min="0"
            value={maxMessagesToFeed}
            onChange={handleMaxMessagesChange}
            disabled={!summarizeHistory}
          />
        </div>        
        {error && <p className="error-message">{error}</p>}
      </section>
      
      <section className="light-rag-options">
        <h3>Light RAG</h3>
        <div>
          <label>
            <input 
              type="checkbox"
              name="lightRAG"
              value={true}
              checked={lightRAGEnabled}
              onChange={handleLightRAGToggle}
            />
            Enable Light RAG
          </label>
        </div>
        <div>
          <label>LLM Model: </label>
          {loading ? (
            <span>Loading...</span>
          ) : (
            <select 
              value={lightRAGLLMModel} 
              onChange={handleLightRAGLLMModelChange}
              disabled={!lightRAGEnabled || initializing}
            >
              <option value="">--Please choose a model--</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
        </div>    
        <div>
          <label>Embed Model: </label>
          {loading ? (
            <span>Loading...</span>
          ) : (
            <select 
              value={lightRAGEmbedModel} 
              onChange={handleLightRAGEmbedModelChange}
              disabled={!lightRAGEnabled || initializing}
            >
              <option value="">--Please choose a model--</option>
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
        </div>         
        {error && <p className="error-message">{error}</p>}
        
        <div style={{ marginTop: '10px', marginLeft: '20px' }}>
          <button 
            onClick={handleInitialize} 
            disabled={!lightRAGEnabled || initializing}
            style={{ width: '200px' }}
          >
            {initializing ? 'Initializing...' : 'Initialize Light RAG'}
          </button>
        </div>
      </section>

    </div>
  );
}

export default OptionsTab;