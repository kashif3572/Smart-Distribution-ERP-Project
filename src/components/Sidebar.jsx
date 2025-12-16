// src/components/Sidebar.jsx - CLEAN VERSION
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menu = {
    admin: [
      { 
        to: '/', 
        label: 'Dashboard', 
        icon: '📊',
        exact: true 
      },
      { 
        to: '/orders', 
        label: 'Sales Orders', 
        icon: '📦'
      },
      { 
        to: '/customers', 
        label: 'Customers', 
        icon: '👥'
      },
      { 
        to: '/purchases', 
        label: 'Purchases', 
        icon: '🛒'
      },
      { 
        to: '/delivery', 
        label: 'Order Deliverd', 
        icon: '🚚'
      },
      { 
        to: '/assign-delivery', 
        label: 'Assign Delivery', 
        icon: '📍'
      },
      { 
        to: '/add-product', 
        label: 'Add Product', 
        icon: '➕'
      },
      { 
        to: '/add-employee', 
        label: 'Add Employee', 
        icon: '👨‍💼'
      }
	  
    ],
    sales: [
      { 
        to: '/sales-dashboard', 
        label: 'Dashboard', 
        icon: '📊',
        exact: true 
      },
      { 
        to: '/orders', 
        label: 'Orders', 
        icon: '📦'
      },
      { 
        to: '/customers', 
        label: 'Customers', 
        icon: '👥'
      },
      { 
        to: '/sales-order', 
        label: 'Sales Order', 
        icon: '💵'
      }
    ],
    rider: [
      { 
        to: '/rider-dashboard', 
        label: 'Dashboard', 
        icon: '📊',
        exact: true 
      },
      { 
        to: '/delivery', 
        label: 'My Deliveries', 
        icon: '🚚'
      }
    ]
  };

  const items = menu[user?.role] || [];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg"
      >
        {isCollapsed ? '☰' : '✕'}
      </button>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        fixed lg:sticky top-0 w-64 bg-gradient-to-b from-blue-800 via-blue-800 to-blue-900 text-white 
        h-screen z-30 transition-transform duration-300 ease-in-out
        flex flex-col shadow-xl border-r border-blue-700
      `}>
        {/* Header */}
        <div className="p-4 border-b border-blue-700 bg-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <span className="text-lg font-bold">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">SMART ERP</h1>
                <p className="text-xs text-blue-200">Enterprise Solution</p>
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(true)}
              className="lg:hidden text-blue-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-blue-700 bg-blue-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center font-bold text-white">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name || 'User'}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200 capitalize">{user?.role || 'User'}</span>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-1">
            {items.map((item) => (
              <Link 
                key={item.to}
                to={item.to}
                onClick={() => setIsCollapsed(true)}
                className={`
                  flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200
                  ${isActive(item.to, item.exact) 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'hover:bg-blue-700/50 hover:text-white'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700 bg-blue-800/50">
          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 
                     bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 
                     rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>

          {/* Version Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-blue-300">ERP System v2.0</p>
            <p className="text-xs text-blue-400 mt-1">© 2024 Smart Distribution</p>
          </div>
        </div>
      </aside>
    </>
  );
}