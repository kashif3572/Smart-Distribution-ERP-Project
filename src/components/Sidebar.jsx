// src/components/Sidebar.jsx - UPDATED WITH UNIFIED GRADIENT STYLING
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
      
     // { 
      //  to: '/add-customer', 
       // label: '➕ Add New Shop', 
       // icon: '🏪'
     // },
      { 
        to: '/purchases', 
        label: 'Purchases', 
        icon: '🛒'
      },
      { 
        to: '/delivery', 
        label: 'Order Delivered', 
        icon: '🚚'
      },
      { 
        to: '/assign-delivery', 
        label: 'Assign Delivery', 
        icon: '📍'
      },
     // { 
       // to: '/add-product', 
       // label: 'Add Product', 
      //  icon: '📦'
     // },
	  { 
        to: '/products', 
        label: 'Product Management', 
        icon: '📦' // or '🏷️' or '💰' for price icon
      },
      { 
        to: '/add-employee', 
        label: 'Employee Management', 
        icon: '👨‍💼'
      },
	  { 
        to: '/customers', 
        label: 'Customers Management', 
        icon: '👥'
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
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
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

      {/* Sidebar - RESPONSIVE VERSION */}
      <aside className={`
        ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        fixed lg:sticky top-0 left-0 
        w-52 sm:w-56 md:w-60 lg:w-64 xl:w-72  /* Responsive widths */
        bg-gradient-to-b from-blue-800 via-blue-800 to-blue-900 text-white 
        h-screen z-30 transition-all duration-300 ease-in-out
        flex flex-col shadow-xl border-r border-blue-700
        overflow-y-auto  /* Allow scrolling if content overflows */
      `}>
        
        {/* Header - Compact */}
        <div className="p-3 border-b border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg shadow-md">
                <span className="text-base font-bold">⚡</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">SMART ERP</h1>
                <p className="text-xs text-blue-200 truncate">Enterprise Solution</p>
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(true)}
              className="lg:hidden text-blue-200 hover:text-white flex-shrink-0 hover:bg-blue-700/50 p-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* User Info - Compact */}
        <div className="p-3 border-b border-blue-700 bg-gradient-to-r from-blue-800/80 to-blue-900/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-md">
              {getInitials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">{user?.name || 'User'}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-blue-200 capitalize truncate">{user?.role || 'User'}</span>
                <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-300 rounded-full flex-shrink-0">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Compact */}
        <div className="flex-1 p-2 sm:p-3">
          <nav className="space-y-1">
            {items.map((item) => (
              <Link 
                key={item.to}
                to={item.to}
                onClick={() => setIsCollapsed(true)}
                className={`
                  flex items-center space-x-2 px-3 py-2.5 sm:px-3 sm:py-3 
                  rounded-lg transition-all duration-200 text-sm
                  shadow-sm hover:shadow-md
                  ${isActive(item.to, item.exact) 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : 'bg-gradient-to-r from-blue-700/40 to-blue-600/40 text-blue-100 hover:from-blue-600/60 hover:to-blue-500/60 hover:text-white'
                  }
                  border border-blue-600/30
                `}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="font-medium truncate text-xs sm:text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer - Compact */}
        <div className="p-3 border-t border-blue-700 bg-gradient-to-r from-blue-800/80 to-blue-900/80">
          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-sm
                     bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 
                     rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg
                     border border-red-600/30"
          >
            <span className="text-sm">🚪</span>
            <span>Logout</span>
          </button>

          {/* Version Info */}
          <div className="mt-3 text-center">
            <p className="text-xs text-blue-300">ERP System v2.0</p>
            <p className="text-xs text-blue-400 mt-0.5">© 2025 Smart Distribution</p>
          </div>
        </div>
      </aside>
    </>
  );
}