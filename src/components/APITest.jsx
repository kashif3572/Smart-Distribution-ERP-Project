// D:\Smart-Distribution-webapp\src\components\APITest.jsx
import React, { useState } from 'react';
import { sheetsAPI } from '../services/sheetsAPI';

const APITest = ({ minimal = false }) => {
  if (minimal) {
    return (
      <div style={{ position: 'fixed', bottom: '5px', right: '5px', fontSize: '10px', color: 'green' }}>
        ✅ Sheets API
      </div>
    );
  }

  const testHealth = async () => {
    setStatus('Testing...');
    try {
      const result = await sheetsAPI.testConnection();
      setData(result);
      setStatus('✅ Backend online');
    } catch (error) {
      setStatus(`❌ ${error.message}`);
    }
  };

  const testSheets = async () => {
    setStatus('Fetching...');
    try {
      const result = await sheetsAPI.getSheets();
      setData(result);
      setStatus(`✅ ${result.count} sheets`);
    } catch (error) {
      setStatus(`❌ ${error.message}`);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: 'white',
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      border: '2px solid #4CAF50',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 8px 0' }}>API Test</h4>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <button onClick={testHealth} style={btnStyle}>Test Backend</button>
        <button onClick={testSheets} style={btnStyle}>Get Sheets</button>
      </div>
      <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>
        <strong>Status:</strong> {status}
      </p>
      {data && (
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '5px', 
          fontSize: '10px',
          maxHeight: '100px',
          overflow: 'auto',
          margin: 0
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

const btnStyle = {
  padding: '5px 10px',
  background: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '12px'
};

export default APITest;