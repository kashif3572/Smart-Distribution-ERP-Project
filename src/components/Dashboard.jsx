// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { sheetsAPI } from '../services/sheetsAPI';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSheets: 0,
    staffCount: 0,
    productCount: 0,
    orderCount: 0,
    lastUpdated: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Test connection
      const health = await sheetsAPI.testConnection();
      console.log('Backend Health:', health);

      // 2. Get all sheets
      const sheetsResponse = await sheetsAPI.getSheets();
      console.log('Total Sheets:', sheetsResponse.count);

      // 3. Get key data from important sheets
      const [staffData, productsData, ordersData] = await Promise.all([
        sheetsAPI.readSheet('Staff_Master', { limit: 1 }),
        sheetsAPI.readSheet('Product_Inventory', { limit: 1 }),
        sheetsAPI.readSheet('Sales_Orders_Log', { limit: 1 }),
      ]);

      setStats({
        totalSheets: sheetsResponse.count,
        staffCount: staffData.totalRows - 1, // Subtract header row
        productCount: productsData.totalRows - 1,
        orderCount: ordersData.totalRows - 1,
        lastUpdated: new Date().toLocaleTimeString(),
      });

    } catch (err) {
      console.error('Dashboard Error:', err);
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data from Google Sheets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={refreshData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Smart Distributor ERP Dashboard</h1>
        <button onClick={refreshData} className="refresh-btn">
          ↻ Refresh Data
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Google Sheets</h3>
          <div className="stat-value">{stats.totalSheets}</div>
          <p>Connected Sheets</p>
        </div>

        <div className="stat-card">
          <h3>Staff Members</h3>
          <div className="stat-value">{stats.staffCount}</div>
          <p>Active Staff</p>
        </div>

        <div className="stat-card">
          <h3>Products</h3>
          <div className="stat-value">{stats.productCount}</div>
          <p>In Inventory</p>
        </div>

        <div className="stat-card">
          <h3>Sales Orders</h3>
          <div className="stat-value">{stats.orderCount}</div>
          <p>Total Orders</p>
        </div>
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {stats.lastUpdated}</p>
        <p>Backend: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</p>
      </div>
    </div>
  );
};

export default Dashboard;