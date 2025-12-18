// src/auth/AuthContext.jsx - OPTIMIZED VERSION
import React, { createContext, useState, useContext, useEffect } from 'react';
import bcrypt from 'bcryptjs';

const AuthContext = createContext(null);

// Column indices based on your Google Sheets structure
const COLUMNS = {
  STAFF_ID: 0,
  NAME: 1,
  ROLE: 2,
  MOBILE: 3,
  USERNAME: 7,
  PASSWORD_HASH: 8,
  ACCOUNT_STATUS: 9
};

// Role mapping configuration
const ROLE_MAPPING = {
  manager: 'admin',
  rider: 'rider',
  booker: 'sales',
  sales: 'sales',
  admin: 'admin'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('erp_user');
      }
    }
    setLoading(false);
  }, []);

  const checkPassword = (inputPassword, storedPassword) => {
    if (!storedPassword || !inputPassword) return false;
    
    const stored = storedPassword.toString().trim();
    const input = inputPassword.toString().trim();
    
    try {
      if (stored.startsWith('$2')) {
        return bcrypt.compareSync(input, stored);
      }
      return stored === input;
    } catch {
      return false;
    }
  };

  const login = async (username, password) => {
    try {
      if (!username || !password) {
        throw new Error('Please enter username and password');
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app';
      const response = await fetch(`${API_URL}/api/read/Staff_Master`);
      
      if (!response.ok) {
        throw new Error('Server connection failed');
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data || result.data.length < 2) {
        throw new Error('No staff data available');
      }
      
      const rows = result.data.slice(1);
      const userRow = rows.find(row => {
        const rowUsername = row[COLUMNS.USERNAME];
        return rowUsername && rowUsername.toString().trim().toLowerCase() === username.trim().toLowerCase();
      });
      
      if (!userRow) {
        throw new Error('User not found');
      }
      
      // Check account status
      const status = userRow[COLUMNS.ACCOUNT_STATUS] || 'Active';
      if (status.toString().toLowerCase() !== 'active') {
        throw new Error('Account is not active');
      }
      
      // Check password
      const storedPassword = userRow[COLUMNS.PASSWORD_HASH] || '';
      if (!storedPassword) {
        throw new Error('Account not properly configured');
      }
      
      if (!checkPassword(password, storedPassword)) {
        throw new Error('Incorrect password');
      }
      
      // Map role
      const rawRole = userRow[COLUMNS.ROLE] ? userRow[COLUMNS.ROLE].toString().trim().toLowerCase() : 'booker';
      const mappedRole = ROLE_MAPPING[rawRole] || 'sales';
      
      // Create user object
      const userData = {
        id: userRow[COLUMNS.STAFF_ID] || '',
        name: userRow[COLUMNS.NAME] || '',
        username: username,
        role: mappedRole,
        staffId: userRow[COLUMNS.STAFF_ID] || '',
        mobile: userRow[COLUMNS.MOBILE] || '',
        lastLogin: new Date().toISOString()
      };
      
      // Save to storage
      localStorage.setItem('erp_user', JSON.stringify(userData));
      localStorage.setItem('erp_token', `erp_${Date.now()}`);
      setUser(userData);
      
      return { success: true, user: userData };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    window.location.href = '/login';
  };

  const hasRole = (requiredRole) => user?.role === requiredRole;
  const hasAnyRole = (roles) => roles.includes(user?.role);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      hasRole,
      hasAnyRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);