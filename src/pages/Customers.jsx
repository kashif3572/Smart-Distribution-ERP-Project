// src/pages/CustomerManagement.jsx - COMPLETE CUSTOMER MANAGEMENT SYSTEM
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function CustomerManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('viewCustomers');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [editShopIdInput, setEditShopIdInput] = useState('');
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  // Webhook URLs
  const UPDATE_WEBHOOK = 'https://n8n.edutechpulse.online/webhook/update-customer';
  const DELETE_WEBHOOK = 'https://n8n.edutechpulse.online/webhook/delete-customer';
  const READ_API_URL = `${import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app'}/api/read/Customers_DB`;

  // Fetch data from Google Sheets
  const fetchData = async () => {
  try {
    setLoading(true);
    setError(''); // Clear any existing error
    
    console.log('📞 Fetching customer data from Google Sheets...');
    
    const response = await fetch(READ_API_URL);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      
      if (!result.success || !result.data || result.data.length < 2) {
        throw new Error('No customer data found in Google Sheets');
      }
      
      const headers = result.data[0];
      const rows = result.data.slice(1);
      
      // Map column indices
      const shopIdIndex = headers.indexOf('Shop_ID');
      const shopNameIndex = headers.indexOf('Shop_Name');
      const ownerMobileIndex = headers.indexOf('Owner_Mobile');
      const ownerNameIndex = headers.indexOf('Owner_Name');
      const areaIdIndex = headers.indexOf('Area_ID');
      const creditLimitIndex = headers.indexOf('Credit_Limit');
      const currentBalanceIndex = headers.indexOf('Current_Balance');
      const lastVisitDateIndex = headers.indexOf('Last_Visit_Date');
      
      // Process customers
      const customers = [];
      const seenShopIds = new Set();
      
      rows.forEach((row, index) => {
        try {
          const shopId = row[shopIdIndex] || `SHP-${index + 1001}`;
          
          if (seenShopIds.has(shopId)) {
            console.log(`⚠️ Skipping duplicate Shop_ID: ${shopId}`);
            return;
          }
          seenShopIds.add(shopId);
          
          const shopName = row[shopNameIndex] || `Customer ${index + 1}`;
          const ownerMobile = row[ownerMobileIndex] || '';
          const ownerName = row[ownerNameIndex] || 'N/A';
          const areaId = row[areaIdIndex] || 'Unknown';
          const creditLimit = parseFloat(row[creditLimitIndex]) || 0;
          const currentBalance = parseFloat(row[currentBalanceIndex]) || 0;
          const lastVisitDate = row[lastVisitDateIndex] || '';
          
          // Calculate metrics
          const availableLimit = Math.max(creditLimit - currentBalance, 0);
          const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
          
          // Determine status
          let status = 'Active';
          if (currentBalance > 0) status = 'Outstanding';
          if (utilization > 80) status = 'Over Limit';
          
          // Calculate visit recency
          let isRecentlyVisited = false;
          let requiresFollowUp = false;
          let daysSinceVisit = null;
          
          if (lastVisitDate) {
            try {
              const visitDate = new Date(lastVisitDate);
              if (!isNaN(visitDate.getTime())) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                visitDate.setHours(0, 0, 0, 0);
                
                daysSinceVisit = Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
                isRecentlyVisited = daysSinceVisit <= 7;
                requiresFollowUp = daysSinceVisit > 30;
              }
            } catch (e) {
              console.error('Date parsing error:', e);
            }
          } else {
            requiresFollowUp = true;
          }
          
          customers.push({
            shopId,
            shopName,
            ownerMobile,
            ownerName,
            areaId,
            financials: {
              creditLimit,
              currentBalance,
              availableLimit,
              utilization
            },
            lastVisitDate,
            status,
            isRecentlyVisited,
            requiresFollowUp,
            daysSinceVisit,
            rowIndex: index + 2 // +2 because header is row 1, and array is 0-indexed
          });
          
        } catch (rowError) {
          console.error(`Error processing row ${index}:`, rowError);
        }
      });
      
      // Calculate summary statistics
      const totalShops = customers.length;
      const recentlyVisited = customers.filter(c => c.isRecentlyVisited).length;
      const withOutstanding = customers.filter(c => c.financials.currentBalance > 0).length;
      const requiresFollowUp = customers.filter(c => c.requiresFollowUp).length;
      const totalOutstanding = customers.reduce((sum, c) => sum + c.financials.currentBalance, 0);
      const averageBalance = totalShops > 0 ? totalOutstanding / totalShops : 0;
      
      // Get unique areas for filter
      const uniqueAreas = [...new Set(customers.map(c => c.areaId).filter(Boolean))].sort();
      
      setData({
        summary: {
          totalShops,
          recentlyVisited,
          withOutstanding,
          requiresFollowUp,
          totalOutstanding,
          averageBalance,
          uniqueAreas: uniqueAreas.length
        },
        customers,
        uniqueAreas,
        totalRows: rows.length,
        uniqueRows: customers.length
      });
      
      setLastRefresh(new Date());
      
      console.log('✅ Customer processing complete:', {
        totalRows: rows.length,
        uniqueCustomers: customers.length,
        summary: { totalShops, recentlyVisited, withOutstanding, requiresFollowUp, totalOutstanding }
      });
      
    } catch (err) {
    console.error('❌ Error fetching customer data:', err);
    
    if (err.message.includes('No customer data found')) {
      setError('No customer data found. Please add customers first.');
    } else if (err.message.includes('Failed to fetch')) {
      setError('Unable to connect to server. Please check your connection.');
    } else {
      setError(`Failed to load customer data: ${err.message}`);
    }
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError('');
    }, 5000);
    
    // Set empty data structure
    setData({
      summary: {
        totalShops: 0,
        recentlyVisited: 0,
        withOutstanding: 0,
        requiresFollowUp: 0,
        totalOutstanding: 0,
        averageBalance: 0,
        uniqueAreas: 0
      },
      customers: [],
      uniqueAreas: []
    });
  } finally {
    setLoading(false);
  }
};

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Filter and sort customers
  const getFilteredAndSortedCustomers = () => {
    if (!data?.customers) return [];
    
    let filtered = [...data.customers];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.shopId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.ownerMobile.includes(searchTerm) ||
        customer.areaId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply area filter
    if (filterArea !== 'all') {
      filtered = filtered.filter(customer => 
        customer.areaId === filterArea
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'lastVisit':
          aValue = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          bValue = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
          break;
        case 'balance':
          aValue = a.financials.currentBalance;
          bValue = b.financials.currentBalance;
          break;
        case 'name':
          aValue = a.shopName.toLowerCase();
          bValue = b.shopName.toLowerCase();
          break;
        case 'area':
          aValue = a.areaId.toLowerCase();
          bValue = b.areaId.toLowerCase();
          break;
        default:
          aValue = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
          bValue = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
    const formattedAmount = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `Rs ${formattedAmount}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format phone
  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 12) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{7})/, '$1-$2-$3');
    } else if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{7})/, '$1-$2');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{7})/, '$1-$2');
    }
    return phone;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Outstanding':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Over Limit':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  // Get days since visit text
  const getDaysSinceVisitText = (customer) => {
    if (!customer.lastVisitDate) return 'Never visited';
    if (customer.daysSinceVisit !== null) {
      if (customer.daysSinceVisit === 0) return 'Today';
      if (customer.daysSinceVisit === 1) return 'Yesterday';
      if (customer.daysSinceVisit <= 7) return `${customer.daysSinceVisit} days ago`;
      if (customer.daysSinceVisit <= 30) return `${customer.daysSinceVisit} days ago`;
      return `${customer.daysSinceVisit} days ago`;
    }
    return formatDate(customer.lastVisitDate);
  };

  // Handle delete customer
 const handleDeleteCustomer = async () => {
  if (!deleteConfirm) return;
  
  try {
    setLoading(true);
    setError('');
    
    const deleteData = {
      Shop_ID: deleteConfirm.shopId,
      Shop_Name: deleteConfirm.shopName,
      Deleted_By: user?.email || 'Admin',
      Delete_Date: new Date().toISOString().split('T')[0],
      Timestamp: new Date().toISOString()
    };
    
    console.log('🗑️ Deleting customer:', deleteData);
    
    const response = await fetch(DELETE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deleteData)
    });
    
    const result = await response.text();
    console.log('Delete response:', result);
    
    if (response.ok) {
      alert(`✅ Customer "${deleteConfirm.shopName}" deleted successfully!`);
      setDeleteConfirm(null);
      fetchData(); // Refresh data
    } else {
      throw new Error(`Delete failed: ${result}`);
    }
  } catch (err) {
    console.error('Error deleting customer:', err);
    const errorMsg = `❌ Error deleting customer: ${err.message}`;
    alert(errorMsg);
    
    // Also set the main error state
    setError(errorMsg);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError('');
    }, 5000);
  } finally {
    setLoading(false);
  }
};

  // Handle edit customer (when clicking edit button from table)
  const handleEditCustomer = (customer) => {
    setEditingCustomer({
      ...customer,
      Credit_Limit: customer.financials.creditLimit.toString(),
      Current_Balance: customer.financials.currentBalance.toString(),
      Last_Visit_Date: customer.lastVisitDate || new Date().toISOString().split('T')[0]
    });
    setActiveSection('editCustomer');
  };

  // Handle update customer
const handleUpdateCustomer = async (formData) => {
  try {
    setLoading(true);
    setUpdateError('');
    setUpdateSuccess('');
    
    const updateData = {
      Shop_ID: formData.shopId,
      Shop_Name: formData.shopName,
      Owner_Mobile: formData.ownerMobile,
      Owner_Name: formData.ownerName,
      Area_ID: formData.areaId,
      Credit_Limit: parseFloat(formData.Credit_Limit) || 0,
      Current_Balance: parseFloat(formData.Current_Balance) || 0,
      Last_Visit_Date: formData.Last_Visit_Date,
      Updated_By: user?.email || 'Admin',
      Update_Date: new Date().toISOString().split('T')[0],
      Timestamp: new Date().toISOString()
    };
    
    console.log('📤 Updating customer:', updateData);
    
    const response = await fetch(UPDATE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.text();
    console.log('Update response:', result);
    
    if (response.ok) {
      setUpdateSuccess('✅ Customer updated successfully!');
      setTimeout(() => {
        setUpdateSuccess('');
        setEditingCustomer(null);
        setActiveSection('viewCustomers');
        fetchData(); // Refresh data
      }, 2000);
    } else {
      throw new Error(`Update failed: ${result}`);
    }
  } catch (err) {
    console.error('Error updating customer:', err);
    setUpdateError(`❌ Error updating customer: ${err.message}`);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setUpdateError('');
    }, 5000);
  } finally {
    setLoading(false);
  }
};

  // Auto-fill customer data when Shop ID is entered in edit section
  const handleAutoFillCustomer = async () => {
    if (!editShopIdInput.trim()) {
      setCustomerNotFound(false);
      setEditingCustomer(null);
      return;
    }
    
    setAutoFillLoading(true);
    setCustomerNotFound(false);
    
    try {
      const shopId = editShopIdInput.trim().toUpperCase();
      
      // Find customer in existing data
      const customer = data?.customers?.find(c => 
        c.shopId.toUpperCase() === shopId
      );
      
      if (customer) {
        setEditingCustomer({
          ...customer,
          Credit_Limit: customer.financials.creditLimit.toString(),
          Current_Balance: customer.financials.currentBalance.toString(),
          Last_Visit_Date: customer.lastVisitDate || new Date().toISOString().split('T')[0]
        });
        setCustomerNotFound(false);
      } else {
        setEditingCustomer(null);
        setCustomerNotFound(true);
      }
    } catch (err) {
      console.error('Error auto-filling customer:', err);
    } finally {
      setAutoFillLoading(false);
    }
  };

  // Auto-fill when Shop ID changes (with debounce)
  useEffect(() => {
    if (activeSection === 'editCustomer' && editShopIdInput.trim()) {
      const timer = setTimeout(() => {
        handleAutoFillCustomer();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [editShopIdInput, activeSection]);

  // Export to CSV
  const exportToCSV = () => {
    const filteredCustomers = getFilteredAndSortedCustomers();
    const csvContent = [
      ['Shop_ID', 'Shop_Name', 'Owner_Name', 'Owner_Mobile', 'Area_ID', 'Current_Balance', 'Credit_Limit', 'Last_Visit_Date', 'Status'],
      ...filteredCustomers.map(c => [
        c.shopId,
        c.shopName,
        c.ownerName,
        c.ownerMobile,
        c.areaId,
        c.financials.currentBalance,
        c.financials.creditLimit,
        c.lastVisitDate || '',
        c.status
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredCustomers = getFilteredAndSortedCustomers();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-blue-600">👥</span>
              Customer Management
            </h1>
            <p className="text-gray-600 text-sm mt-1">Manage shops, customers, and view insights</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setActiveSection('addCustomer')}
              className="px-4 py-3 sm:px-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>Add Customer</span>
            </button>
            <button
  onClick={() => {
    setError(''); // Clear error immediately
    fetchData();
  }}
  disabled={loading}
  className="px-4 py-3 sm:px-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
>
  {loading ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span>Loading...</span>
    </>
  ) : (
    <>
      <span>🔄</span>
      <span>Refresh</span>
    </>
  )}
</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Total Shops</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{data?.summary?.totalShops || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">🏪</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Recently Visited</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {data?.summary?.recentlyVisited || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Outstanding</p>
                <p className="text-xl font-bold text-yellow-600 mt-1">
                  {data?.summary?.withOutstanding || 0}
                </p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(data?.summary?.totalOutstanding || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Follow-up Needed</p>
                <p className="text-xl font-bold text-red-600 mt-1">
                  {data?.summary?.requiresFollowUp || 0}
                </p>
                <p className="text-xs text-gray-500">Not visited in 30+ days</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600">🔔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveSection('viewCustomers')}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === 'viewCustomers' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span>👁️</span>
            <span>View Customers</span>
          </button>
          <button
            onClick={() => {
              setActiveSection('addCustomer');
              setEditingCustomer(null);
            }}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === 'addCustomer' 
                ? 'bg-green-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span>➕</span>
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => {
              setActiveSection('editCustomer');
              setEditingCustomer(null);
              setEditShopIdInput('');
              setCustomerNotFound(false);
            }}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === 'editCustomer' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <span>✏️</span>
            <span>Edit Customer</span>
          </button>
        </div>

        {/* VIEW CUSTOMERS SECTION */}
        {activeSection === 'viewCustomers' && (
          <>
            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="all">All Areas</option>
                    {data?.uniqueAreas?.map((area, index) => (
                      <option key={index} value={area}>{area}</option>
                    ))}
                  </select>
                  
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="lastVisit">Last Visit</option>
                    <option value="balance">Balance</option>
                    <option value="name">Name</option>
                    <option value="area">Area</option>
                  </select>
                  
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </button>
                </div>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading customers...</span>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No customers found</h3>
                  <p className="text-gray-500 mb-4">Try changing your search or filter criteria</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterArea('all');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Shop Details
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Area
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Financials
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Visit
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.map((customer, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 text-sm">🏪</span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm">
                                    {customer.shopName}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                                      {customer.shopId}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {customer.ownerName}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {formatPhone(customer.ownerMobile)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                {customer.areaId}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Balance:</span>
                                  <span className={`font-semibold ${customer.financials.currentBalance > 0 ? 'text-red-600' : 'text-green-600'} text-sm`}>
                                    {formatCurrency(customer.financials.currentBalance)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Limit:</span>
                                  <span className="font-medium text-blue-600 text-sm">
                                    {formatCurrency(customer.financials.creditLimit)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Available:</span>
                                  <span className="font-medium text-green-600 text-xs">
                                    {formatCurrency(customer.financials.availableLimit)}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="text-sm text-gray-900">
                                  {getDaysSinceVisitText(customer)}
                                </div>
                                {customer.requiresFollowUp && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                      ⚠️ Follow-up
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                                {customer.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleEditCustomer(customer)}
                                  className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-yellow-100"
                                >
                                  <span>✏️</span>
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setSelectedCustomer(customer)}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-blue-100"
                                >
                                  <span>👁️</span>
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(customer)}
                                  className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-red-100"
                                >
                                  <span>🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Table Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                      <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                        Showing <span className="font-semibold">{filteredCustomers.length}</span> of <span className="font-semibold">{data?.customers?.length || 0}</span> customers
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={exportToCSV}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded text-xs flex items-center gap-1 hover:bg-green-100"
                        >
                          <span>📥</span>
                          Export CSV
                        </button>
                        <div className="text-sm">
                          <span className="text-gray-500">Outstanding:</span>{" "}
                          <span className="font-semibold text-red-600">
                            {formatCurrency(
                              filteredCustomers.reduce((sum, c) => sum + c.financials.currentBalance, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ADD CUSTOMER SECTION - FIXED: Show form below the tab */}
        {activeSection === 'addCustomer' && (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Add New Customer (Shop)</h2>
                  <p className="text-gray-600 text-sm">Add new shops/customers. Data will be appended to Google Sheets automatically.</p>
                </div>
                <button
                  onClick={() => setActiveSection('viewCustomers')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Customers
                </button>
              </div>
            </div>

            {/* Add Customer Form - Using the corrected AddCustomerForm */}
            <div className="p-6">
              <AddCustomerForm 
                onSuccess={() => {
                  fetchData();
                  setActiveSection('viewCustomers');
                }} 
                onCancel={() => setActiveSection('viewCustomers')}
              />
            </div>
          </div>
        )}

        {/* EDIT CUSTOMER SECTION - FIXED: Now shows Shop ID lookup and form */}
        {activeSection === 'editCustomer' && (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingCustomer ? `Edit Customer: ${editingCustomer.shopName}` : 'Edit Customer'}
                  </h2>
                  <p className="text-gray-600 text-sm">Search for a customer by Shop ID to edit their details</p>
                </div>
                <button
                  onClick={() => {
                    setActiveSection('viewCustomers');
                    setEditingCustomer(null);
                    setEditShopIdInput('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Customers
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Shop ID Lookup */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Shop ID to Edit *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={editShopIdInput}
                      onChange={(e) => setEditShopIdInput(e.target.value)}
                      placeholder="Enter Shop ID (e.g., SHP-001)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-3 top-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFillCustomer}
                    disabled={autoFillLoading || !editShopIdInput.trim()}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
                  >
                    {autoFillLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Searching
                      </div>
                    ) : (
                      'Search Customer'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Start typing Shop ID and customer details will auto-fill below
                </p>
                
                {customerNotFound && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-red-800">Customer Not Found</h4>
                        <p className="text-red-700 mt-1">No customer found with Shop ID: <span className="font-mono">{editShopIdInput}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {updateSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-green-800">Success!</h4>
                      <p className="text-green-700 mt-1">{updateSuccess}</p>
                    </div>
                  </div>
                </div>
              )}

              {updateError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-red-800">Error</h4>
                      <p className="text-red-700 mt-1">{updateError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Form (Only show when customer is found) */}
              {editingCustomer && (
                <EditCustomerForm 
                  customer={editingCustomer}
                  onSubmit={handleUpdateCustomer}
                  onCancel={() => {
                    setEditingCustomer(null);
                    setEditShopIdInput('');
                    setCustomerNotFound(false);
                  }}
                  existingAreas={data?.uniqueAreas || []}
                  updateSuccess={updateSuccess}
                  updateError={updateError}
                  loading={loading}
                  onDelete={(customer) => {
                    setDeleteConfirm(customer);
                    setActiveSection('viewCustomers');
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* CUSTOMER DETAIL MODAL */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedCustomer.shopName}</h2>
                    <p className="text-gray-600">{selectedCustomer.shopId}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-600 text-sm">Owner Name</p>
                        <p className="font-medium">{selectedCustomer.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Mobile Number</p>
                        <p className="font-medium font-mono">{formatPhone(selectedCustomer.ownerMobile)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Area</p>
                        <p className="font-medium">{selectedCustomer.areaId}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Financial Information</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-600 text-sm">Current Balance</p>
                        <p className={`font-bold text-lg ${selectedCustomer.financials.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(selectedCustomer.financials.currentBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Credit Limit</p>
                        <p className="font-bold text-lg">{formatCurrency(selectedCustomer.financials.creditLimit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Available Limit</p>
                        <p className="font-bold text-lg text-green-600">{formatCurrency(selectedCustomer.financials.availableLimit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-sm">Utilization</p>
                        <p className="font-bold text-lg">{selectedCustomer.financials.utilization.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Activity & Status</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className={`px-4 py-2 rounded-lg ${getStatusColor(selectedCustomer.status)}`}>
                      <span className="font-medium">Status:</span> {selectedCustomer.status}
                    </div>
                    <div className="px-4 py-2 rounded-lg bg-gray-100">
                      <span className="font-medium">Last Visit:</span> {getDaysSinceVisitText(selectedCustomer)}
                    </div>
                    {selectedCustomer.isRecentlyVisited && (
                      <div className="px-4 py-2 rounded-lg bg-green-100 text-green-800 border border-green-200">
                        Recently Active (Last 7 days)
                      </div>
                    )}
                    {selectedCustomer.requiresFollowUp && (
                      <div className="px-4 py-2 rounded-lg bg-red-100 text-red-800 border border-red-200">
                        ⚠️ Requires Follow-up
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      handleEditCustomer(selectedCustomer);
                      setActiveSection('editCustomer');
                    }}
                    className="px-5 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
                  >
                    Edit Customer
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xl">🗑️</span>
                  </div>
                </div>
                
                <h2 className="text-lg font-bold text-gray-800 text-center mb-2">
                  Delete Customer
                </h2>
                
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.shopName}"</span> (ID: {deleteConfirm.shopId})?
                </p>
                
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-medium">⚠️ This action cannot be undone!</p>
                    <p className="text-xs text-red-600 mt-1">
                      • Customer will be removed from database<br/>
                      • All associated data will be deleted<br/>
                      • No automatic backup available
                    </p>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleDeleteCustomer}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 font-medium"
                    >
                      {loading ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={loading}
                      className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Add Customer Form Component (Updated with your fixes)
function AddCustomerForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    Shop_ID: '',
    Shop_Name: '',
    Owner_Mobile: '',
    Owner_Name: '',
    Area_ID: '',
    Credit_Limit: '0',
    Current_Balance: '0',
    Last_Visit_Date: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingShops, setExistingShops] = useState([]);
  const [existingAreas, setExistingAreas] = useState(['AREA-01', 'AREA-02', 'AREA-03', 'AREA-04', 'AREA-05']);
  const [customArea, setCustomArea] = useState('');
  const [fetchingData, setFetchingData] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);

  const WEBHOOK_URL = 'https://n8n.edutechpulse.online/webhook/Add-customer';
  const READ_API_URL = `${import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app'}/api/read/Customers_DB`;

  useEffect(() => {
    fetchExistingData();
  }, []);

  const fetchExistingData = async () => {
    try {
      setFetchingData(true);
      const response = await fetch(READ_API_URL);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const shops = result.data.slice(1)
            .map(row => row[0])
            .filter(Boolean)
            .filter(id => typeof id === 'string' && id.toString().startsWith('SHP-'));
          
          setExistingShops(shops);
          
          const areas = [...new Set(
            result.data.slice(1)
              .map(row => row[4])
              .filter(Boolean)
              .filter(area => area && area.toString().trim() !== '')
              .map(area => area.toString().trim())
          )];
          
          if (areas.length > 0) {
            setExistingAreas(prev => [...new Set([...prev, ...areas])]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching existing data:', err);
    } finally {
      setFetchingData(false);
    }
  };

  const generateNextShopId = () => {
    setGeneratingId(true);
    try {
      let maxNum = 0;
      existingShops.forEach(shopId => {
        const match = shopId.toString().match(/SHP[-_]?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      
      const nextNum = maxNum + 1;
      const newShopId = `SHP-${nextNum.toString().padStart(3, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        Shop_ID: newShopId
      }));
    } catch (err) {
      const fallbackId = `SHP-${(existingShops.length + 1).toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, Shop_ID: fallbackId }));
    } finally {
      setGeneratingId(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'Area_ID') {
      if (value === 'custom') {
        // User selected "Add New Area", show custom input
        setFormData(prev => ({ ...prev, [name]: 'custom' }));
        setCustomArea('AREA-');
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
        setCustomArea(''); // Reset custom area
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add new area to dropdown
  const addNewArea = () => {
    if (customArea && customArea.trim() !== '') {
      let newArea = customArea.trim().toUpperCase();
      
      // Ensure it has AREA- prefix
      if (!newArea.startsWith('AREA-')) {
        newArea = `AREA-${newArea.replace(/^AREA-/i, '')}`;
      }
      
      // Clean up any extra characters
      newArea = newArea.replace(/[^A-Z0-9-]/g, '');
      
      if (newArea && !existingAreas.includes(newArea)) {
        // Add new area to dropdown
        setExistingAreas(prev => [...prev, newArea]);
        // Set the new area as selected in form
        setFormData(prev => ({ ...prev, Area_ID: newArea }));
        // Clear custom area input
        setCustomArea('');
        console.log(`✅ New area added: ${newArea}`);
      }
    }
  };

  // Handle custom area input change (only update customArea, not formData)
  const handleCustomAreaChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomArea(`AREA-${value}`);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.Shop_ID.trim()) errors.push('Shop ID is required');
    if (!formData.Shop_Name.trim()) errors.push('Shop Name is required');
    if (!formData.Owner_Name.trim()) errors.push('Owner Name is required');
    if (!formData.Owner_Mobile.trim()) errors.push('Mobile Number is required');
    if (!formData.Area_ID.trim() || formData.Area_ID === 'custom') errors.push('Area is required');
    
    const mobileRegex = /^[0-9]{10,12}$/;
    const cleanMobile = formData.Owner_Mobile.replace(/\D/g, '');
    if (cleanMobile && !mobileRegex.test(cleanMobile)) {
      errors.push('Mobile number must be 10-12 digits');
    }
    
    if (formData.Credit_Limit && (isNaN(formData.Credit_Limit) || parseFloat(formData.Credit_Limit) < 0)) {
      errors.push('Credit Limit must be a positive number');
    }
    
    if (existingShops.includes(formData.Shop_ID)) {
      errors.push('Shop ID already exists. Please use a different ID.');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      setLoading(false);
      return;
    }

    try {
      const customerData = {
        "Shop_ID": formData.Shop_ID,
        "Shop_Name": formData.Shop_Name,
        "Owner_Mobile": formData.Owner_Mobile,
        "Owner_Name": formData.Owner_Name,
        "Area_ID": formData.Area_ID,
        "Credit_Limit": formData.Credit_Limit || '0',
        "Current_Balance": formData.Current_Balance || '0',
        "Last_Visit_Date": formData.Last_Visit_Date || new Date().toISOString().split('T')[0],
        "timestamp": new Date().toISOString(),
        "added_by": 'admin',
        "source": "Admin Panel"
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        const successMsg = '✅ Customer added successfully!';
        setSuccess(successMsg);
        setExistingShops(prev => [...prev, formData.Shop_ID]);
        
        if (formData.Area_ID && !existingAreas.includes(formData.Area_ID)) {
          setExistingAreas(prev => [...prev, formData.Area_ID]);
        }

        setTimeout(() => {
          setFormData({
            Shop_ID: '',
            Shop_Name: '',
            Owner_Mobile: '',
            Owner_Name: '',
            Area_ID: '',
            Credit_Limit: '0',
            Current_Balance: '0',
            Last_Visit_Date: new Date().toISOString().split('T')[0]
          });
          setCustomArea('');
          setSuccess('');
          onSuccess();
        }, 2000);
      } else {
        throw new Error('Failed to add customer');
      }
    } catch (err) {
      setError(`Failed to send data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = () => {
    setError('');
    fetchExistingData();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0114 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-800">Error</h4>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-green-800">Success!</h4>
              <p className="text-green-700 mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Shop ID */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Shop ID <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                name="Shop_ID"
                value={formData.Shop_ID}
                onChange={handleChange}
                placeholder="e.g., SHP-001"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                required
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={generateNextShopId}
              disabled={generatingId || fetchingData}
              className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px]"
            >
              {generatingId ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generating
                </div>
              ) : (
                'Generate ID'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {fetchingData ? (
              <span className="flex items-center">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                Loading existing data...
              </span>
            ) : formData.Shop_ID && existingShops.includes(formData.Shop_ID) ? (
              <span className="text-red-600">⚠️ This Shop ID already exists</span>
            ) : (
              `Next available: SHP-${(existingShops.length + 1).toString().padStart(3, '0')}`
            )}
          </p>
        </div>

        {/* Shop Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Shop Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="Shop_Name"
              value={formData.Shop_Name}
              onChange={handleChange}
              placeholder="e.g., City Supermarket"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Full name of the shop/store</p>
        </div>

        {/* Owner Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Owner Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="Owner_Name"
              value={formData.Owner_Name}
              onChange={handleChange}
              placeholder="e.g., Waqas Ali"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Full name of the shop owner</p>
        </div>

        {/* Owner Mobile */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Owner Mobile <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              name="Owner_Mobile"
              value={formData.Owner_Mobile}
              onChange={handleChange}
              placeholder="e.g., 923406540001"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">10-12 digit mobile number</p>
        </div>

        {/* Area Field - Updated with working "Add New Area" */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Area <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              name="Area_ID"
              value={formData.Area_ID === 'custom' ? 'custom' : formData.Area_ID}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              required
            >
              <option value="">Select Area</option>
              {existingAreas.map((area, index) => (
                <option key={index} value={area}>
                  {area}
                </option>
              ))}
              <option value="custom">➕ Add New Area</option>
            </select>
            <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Delivery/service area</p>
          
          {/* Custom Area Input - Show when "Add New Area" is selected */}
          {formData.Area_ID === 'custom' && (
            <div className="mt-2 flex gap-2">
              <div className="flex-1">
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-100 text-gray-700 border-r border-gray-300 font-medium">
                    AREA-
                  </span>
                  <input
                    type="text"
                    value={customArea.replace(/^AREA-/i, '')}
                    onChange={handleCustomAreaChange}
                    placeholder="Enter area number (e.g., 06)"
                    className="flex-1 p-2 border-0 focus:ring-0 bg-transparent"
                    maxLength="3"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter numbers only (e.g., 06, 07, 12)</p>
              </div>
              <button
                type="button"
                onClick={addNewArea}
                disabled={!customArea || !customArea.match(/^AREA-\d+$/)}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Add Area
              </button>
            </div>
          )}
        </div>

        {/* Credit Limit */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Credit Limit (Rs)
          </label>
          <div className="relative">
            <input
              type="number"
              name="Credit_Limit"
              value={formData.Credit_Limit}
              onChange={handleChange}
              placeholder="e.g., 300000"
              min="0"
              step="100"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Maximum credit allowed (0 for cash only)</p>
        </div>

        {/* Current Balance */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Current Balance (Rs)
          </label>
          <div className="relative">
            <input
              type="number"
              name="Current_Balance"
              value={formData.Current_Balance}
              onChange={handleChange}
              placeholder="e.g., 4362"
              min="0"
              step="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
              readOnly
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Initial balance (usually 0)</p>
        </div>

        {/* Last Visit Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Last Visit Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="Last_Visit_Date"
              value={formData.Last_Visit_Date}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Date of last visit/service</p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding...
            </div>
          ) : (
            'Add Customer'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Edit Customer Form Component (Updated with Delete button)
function EditCustomerForm({ customer, onSubmit, onCancel, existingAreas, updateSuccess, updateError, loading, onDelete }) {
  const [formData, setFormData] = useState({
    shopId: customer?.shopId || '',
    shopName: customer?.shopName || '',
    ownerMobile: customer?.ownerMobile || '',
    ownerName: customer?.ownerName || '',
    areaId: customer?.areaId || '',
    Credit_Limit: customer?.Credit_Limit || '0',
    Current_Balance: customer?.Current_Balance || '0',
    Last_Visit_Date: customer?.Last_Visit_Date || new Date().toISOString().split('T')[0]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Shop ID (Read-only) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Shop ID</label>
          <div className="relative">
            <input
              type="text"
              value={formData.shopId}
              readOnly
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500">Shop ID cannot be changed</p>
        </div>

        {/* Shop Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Shop Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Owner Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Owner Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Owner Mobile */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Owner Mobile <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              name="ownerMobile"
              value={formData.ownerMobile}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Area */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Area <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              name="areaId"
              value={formData.areaId}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              required
            >
              <option value="">Select Area</option>
              {existingAreas.map((area, index) => (
                <option key={index} value={area}>{area}</option>
              ))}
            </select>
            <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Last Visit Date */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Last Visit Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="Last_Visit_Date"
              value={formData.Last_Visit_Date}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Credit Limit */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Credit Limit (Rs)
          </label>
          <div className="relative">
            <input
              type="number"
              name="Credit_Limit"
              value={formData.Credit_Limit}
              onChange={handleChange}
              min="0"
              step="100"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Current Balance */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Current Balance (Rs)
          </label>
          <div className="relative">
            <input
              type="number"
              name="Current_Balance"
              value={formData.Current_Balance}
              onChange={handleChange}
              min="0"
              step="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Updating...
            </div>
          ) : (
            'Update Customer'
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete && onDelete(customer)}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
        >
          Delete Customer
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}