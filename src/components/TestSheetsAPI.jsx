// src/components/APITest.jsx
import React, { useState } from 'react';
import { sheetsAPI } from '../services/sheetsAPI';

const APITest = () => {
  const [status, setStatus] = useState('Ready to test');
  const [data, setData] = useState(null);

  const testHealth = async () => {
    setStatus('Testing backend connection...');
    try {
      const result = await sheetsAPI.testConnection();
      setData(result);
      setStatus('✅ Backend is online!');
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testSheets = async () => {
    setStatus('Fetching sheet list...');
    try {
      const result = await sheetsAPI.getSheets();
      setData(result);
      setStatus(`✅ Found ${result.count} sheets`);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testStaffData = async () => {
    setStatus('Fetching staff data...');
    try {
      const result = await sheetsAPI.readSheet('Staff_Master', { limit: 3 });
      setData(result);
      setStatus(`✅ Found ${result.totalRows} staff records`);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 1000,
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
      maxWidth: '350px',
      border: '1px solid #4CAF50'
    }}>
     <p style={{ fontSize: '12px', color: '#666', margin: '0 0 15px 0' }}>
  Testing connection to backend: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}
</p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button 
          onClick={testHealth}
          style={buttonStyle}
        >
          Test Backend
        </button>
        <button 
          onClick={testSheets}
          style={buttonStyle}
        >
          Get Sheets
        </button>
        <button 
          onClick={testStaffData}
          style={buttonStyle}
        >
          Get Staff
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {status}
      </div>
      
      {data && (
        <div>
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            marginBottom: '5px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Response:</span>
            <button 
              onClick={() => setData(null)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#999',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Clear
            </button>
          </div>
          <pre style={{
            background: '#f8f9fa',
            padding: '10px',
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '150px',
            fontSize: '10px',
            border: '1px solid #eaeaea',
            margin: 0
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const buttonStyle = {
  padding: '6px 12px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  flex: 1
};

export default APITest;