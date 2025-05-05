import React, { useState, useEffect } from 'react';

function OptionsTab() {
  const [summarizeHistory, setSummarizeHistory] = useState(false);
  const [summaryModel, setSummaryModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxMessagesToFeed, setMaxMessagesToFeed] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [forceRender, setForceRender] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState([]); 
  const [refreshKey, setRefreshKey] = useState(0); // New state for refreshing

  useEffect(() => {
    fetch('http://localhost:8080/api/get_reference_files', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => setReferenceFiles(data.referenceFiles || []))
    .catch(error => console.error('Error fetching reference files:', error));
  }, [refreshKey]); // Update effect to listen for refreshKey changes

  const handleOpenFileBrowser = () => {
    fetch('http://localhost:8080/api/open_file_browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(() => setRefreshKey(refreshKey + 1)) // Trigger a refresh after file selection
    .catch(error => console.error('Error opening file browser:', error));
  };

  const fetchReferenceFiles = () => {
    fetch('http://localhost:8080/api/get_reference_files', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to get reference files.');
      }
      return response.json();
    })
    .then(data => {
      setReferenceFiles(data); // Update state with new reference files
    })
    .catch(error => {
      console.error('Error getting reference files:', error);
    });
  };

  // Fetch settings from the server when component mounts or when active tab changes to OptionsTab
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:8080/api/models').then(res => res.json()),
      fetch('http://localhost:8080/api/get_settings').then(res => res.json()),
      fetch('http://localhost:8080/api/get_reference_files').then(res => res.json()) // Add this fetch call
    ])
    .then(([modelsData, settingsData, referenceFilesData]) => {
            console.log("Reference files response:", referenceFiles); // Add this line
    if ("referenceFiles" in referenceFiles) {
      setReferenceFiles(referenceFiles.referenceFiles);
    } else if ("error" in referenceFiles) {
      setError(`Error fetching reference files: ${referenceFiles.error}`);
    }
        
        
      setAvailableModels(modelsData.models || []);
      setSummarizeHistory(settingsData.summarizeHistory || false);
      setSummaryModel(settingsData.summaryModel || '');
      setMaxMessagesToFeed(settingsData.maxMessagesToFeed || 0);
      setReferenceFiles(referenceFilesData.referenceFiles || []); // Update reference files state
      setLoading(false);
    })
    .catch(err => {
      setError('Error fetching settings, models, or reference files.');
      setLoading(false);
    });
  }, []);

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
      
      <section className="reference-file-upload">
        <h3>Reference Files</h3>
        <button onClick={handleOpenFileBrowser}>Choose File</button>
        {referenceFiles.length > 0 ? (
          <div>
            <h4>Current Reference Files:</h4>
            <ul>
              {referenceFiles.map((file, index) => (
                <li key={index}>{file}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No reference files selected.</p>
        )}
      </section>

      <p>Coming soon: File upload, settings, etc.</p>
    </div>
  );
}

export default OptionsTab;