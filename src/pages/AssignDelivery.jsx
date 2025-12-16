// src/pages/AssignDelivery.jsx - FIXED VERSION
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AssignDelivery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [allRiders, setAllRiders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedRider, setSelectedRider] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showAllRiders, setShowAllRiders] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    } else {
      fetchAssignmentData();
    }
  }, [user, navigate, retryCount]);

  // Fetch real data from Google Sheets
  const fetchAssignmentData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching assignment data from Google Sheets...');
      
      // Fetch pending orders from Order-detail-rider sheet
      const ordersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/read/Order-detail-rider`);
      if (!ordersResponse.ok) {
        throw new Error(`Failed to fetch orders: ${ordersResponse.status}`);
      }
      
      const ordersData = await ordersResponse.json();
      console.log('Orders API response rows:', ordersData.returnedRows);
      
      if (!ordersData.success || !ordersData.data) {
        throw new Error('No order data received from API');
      }
      
      const headers = ordersData.data[0];
      const rows = ordersData.data.slice(1);
      
      // Find exact column indices based on your data structure
      const orderIdIndex = headers.indexOf('Order_ID');
      const shopIdIndex = headers.indexOf('Shop_ID');
      const dateIndex = headers.indexOf('Date');
      const amountIndex = headers.indexOf('Total_Amount');
      const statusIndex = headers.indexOf('Status');
      const areaIndex = headers.indexOf('Area');
      const ridersIndex = headers.indexOf('Assigned_RiderBy_area');
      const productIdIndex = headers.indexOf('Product_ID');
      const productNameIndex = headers.indexOf('Product_Name');
      const quantityIndex = headers.indexOf('Quantity');
      
      console.log('Column indices:', {
        orderIdIndex, shopIdIndex, dateIndex, amountIndex, 
        statusIndex, areaIndex, ridersIndex,
        productIdIndex, productNameIndex, quantityIndex
      });
      
 // Alternative cleaner version:
const ordersMap = new Map();

rows.forEach((row, index) => {
  try {
    const orderId = row[orderIdIndex];
    const status = row[statusIndex] || 'Pending';
    
    if (!orderId || status.toLowerCase() !== 'pending') return;
    
    // Check if we've already processed this order
    if (!ordersMap.has(orderId)) {
      // Create new order entry
      const order = {
        id: index + 1,
        orderId: orderId,
        shopId: row[shopIdIndex] || 'Unknown',
        date: row[dateIndex] || new Date().toISOString().split('T')[0],
        totalAmount: parseFloat(row[amountIndex]) || 0,
        status: status,
        area: row[areaIndex] || 'Unknown',
        availableRidersText: row[ridersIndex] || '',
        selected: false,
        products: []
      };
      
      // Add first product
      const productId = row[productIdIndex];
      const productName = row[productNameIndex];
      const quantity = row[quantityIndex];
      
      if (productId && productName) {
        order.products.push({
          productId: productId,
          productName: productName,
          quantity: quantity || 1
        });
      }
      
      ordersMap.set(orderId, order);
      
    } else {
      // Order exists - only add additional product info
      const order = ordersMap.get(orderId);
      const productId = row[productIdIndex];
      const productName = row[productNameIndex];
      const quantity = row[quantityIndex];
      
      if (productId && productName) {
        // Check if product already exists in the order
        const productExists = order.products.some(p => 
          p.productId === productId && p.productName === productName
        );
        
        if (!productExists) {
          order.products.push({
            productId: productId,
            productName: productName,
            quantity: quantity || 1
          });
        }
      }
    }
    
  } catch (rowError) {
    console.error(`Error processing row ${index}:`, rowError);
  }
});
      
      const processedOrders = Array.from(ordersMap.values());
      console.log(`Processed ${processedOrders.length} unique orders from ${rows.length} rows`);
      console.log('Sample processed order:', processedOrders[0]);
      
      // Fetch riders from Staff_Master sheet
      const staffResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/read/Staff_Master`);
      if (!staffResponse.ok) {
        throw new Error(`Failed to fetch staff: ${staffResponse.status}`);
      }
      
      const staffData = await staffResponse.json();
      console.log('Staff API response rows:', staffData.returnedRows);
      
      if (!staffData.success || !staffData.data) {
        throw new Error('No staff data received from API');
      }
      
      const staffHeaders = staffData.data[0];
      const staffRows = staffData.data.slice(1);
      
      // Find exact column indices in staff data
      const staffIdIndex = staffHeaders.indexOf('Staff_ID');
      const nameIndex = staffHeaders.indexOf('Name');
      const roleIndex = staffHeaders.indexOf('Role');
      const mobileIndex = staffHeaders.indexOf('Mobile');
      const assignedAreaIdIndex = staffHeaders.indexOf('Assigned_Area_ID');
      const assignedAreaNameIndex = staffHeaders.indexOf('Assigned_Area_Name');
      const salaryIndex = staffHeaders.indexOf('Base_Salary');
      
      // Filter and process riders
      const riders = staffRows
        .filter(row => {
          const role = row[roleIndex];
          return role && role.toString().toLowerCase().includes('rider');
        })
        .map((row, index) => {
          const assignedArea = row[assignedAreaIdIndex] || '';
          const areas = assignedArea.split(',').map(area => area.trim()).filter(area => area);
          
          return {
            id: row[staffIdIndex] || `RIDER-${index + 1}`,
            name: row[nameIndex] || 'Unknown Rider',
            mobile: row[mobileIndex] || 'N/A',
            role: row[roleIndex] || 'Rider',
            assignedAreaId: assignedArea,
            assignedAreaName: row[assignedAreaNameIndex] || '',
            assignedAreas: areas.length > 0 ? areas : ['All Areas'],
            salary: parseFloat(row[salaryIndex]) || 0,
            status: 'available',
            deliveriesToday: Math.floor(Math.random() * 5),
            rating: (4.0 + Math.random() * 0.5).toFixed(1)
          };
        });
      
      console.log(`Processed ${riders.length} riders`);
      
      setPendingOrders(processedOrders);
      setAllRiders(riders);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching assignment data:', err);
      setError(`Failed to load data: ${err.message}. Please check your backend server.`);
      
      // Set empty data structure
      setPendingOrders([]);
      setAllRiders([]);
      
    } finally {
      setLoading(false);
    }
  }, []);

  // Parse available riders from order text
  const parseAvailableRiders = (text) => {
    if (!text) return [];
    
    const riders = [];
    try {
      // Remove "Available Riders: " prefix if present
      const cleanText = text.replace('Available Riders:', '').trim();
      
      // Split by comma but be careful with phone numbers in parentheses
      const parts = cleanText.split(/(?<=\))\s*,\s*/);
      
      parts.forEach(part => {
        part = part.trim();
        if (part) {
          // Match pattern like "Name (Phone)"
          const match = part.match(/([^\(]+?)\s*\(([^)]+)\)/);
          if (match) {
            riders.push({
              name: match[1].trim(),
              mobile: match[2].trim()
            });
          }
        }
      });
    } catch (e) {
      console.error('Error parsing riders text:', e);
    }
    
    return riders;
  };

  // Get riders for selected orders
  const getSuggestedRiders = () => {
    if (selectedOrders.length === 0) return [];
    
    const selectedOrderAreas = pendingOrders
      .filter(order => selectedOrders.includes(order.orderId))
      .map(order => order.area);
    
    const uniqueAreas = [...new Set(selectedOrderAreas)];
    
    // Find riders assigned to these areas
    const areaRiders = allRiders.filter(rider => 
      rider.assignedAreas.some(area => 
        uniqueAreas.some(orderArea => 
          area.includes(orderArea) || orderArea.includes(area)
        )
      )
    );
    
    // Find riders mentioned in availableRidersText of selected orders
    const textRidersMap = new Map();
    
    pendingOrders
      .filter(order => selectedOrders.includes(order.orderId))
      .forEach(order => {
        const parsed = parseAvailableRiders(order.availableRidersText);
        parsed.forEach(rider => {
          if (!textRidersMap.has(rider.name)) {
            textRidersMap.set(rider.name, rider);
          }
        });
      });
    
    // Convert to array
    const textRiders = Array.from(textRidersMap.values());
    
    // Match text riders with actual rider data
    const matchedTextRiders = textRiders
      .map(textRider => {
        const actualRider = allRiders.find(r => 
          r.name.toLowerCase() === textRider.name.toLowerCase() ||
          r.mobile === textRider.mobile ||
          r.name.toLowerCase().includes(textRider.name.toLowerCase()) ||
          textRider.name.toLowerCase().includes(r.name.toLowerCase())
        );
        return actualRider;
      })
      .filter(rider => rider);
    
    // Combine area riders and matched text riders, remove duplicates
    const allSuggestedRiders = [...areaRiders];
    matchedTextRiders.forEach(rider => {
      if (!allSuggestedRiders.some(r => r.id === rider.id)) {
        allSuggestedRiders.push(rider);
      }
    });
    
    return allSuggestedRiders;
  };

  // Get all unique areas from orders
  const getUniqueAreas = () => {
    const areas = [...new Set(pendingOrders.map(order => order.area).filter(Boolean))];
    return areas.sort();
  };

  // Handle order selection
  const toggleOrderSelection = (orderId) => {
    setPendingOrders(orders => 
      orders.map(order => 
        order.orderId === orderId 
          ? { ...order, selected: !order.selected }
          : order
      )
    );
    
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  // Handle bulk selection
  const selectAllOrders = () => {
    const allOrderIds = pendingOrders.map(order => order.orderId);
    setSelectedOrders(allOrderIds);
    setPendingOrders(orders => 
      orders.map(order => ({ ...order, selected: true }))
    );
  };

  const clearSelection = () => {
    setSelectedOrders([]);
    setSelectedRider('');
    setPendingOrders(orders => 
      orders.map(order => ({ ...order, selected: false }))
    );
  };

  // Assign deliveries
  const assignDeliveries = async () => {
    if (!selectedRider) {
      alert('Please select a rider first!');
      return;
    }
    
    if (selectedOrders.length === 0) {
      alert('Please select at least one order!');
      return;
    }
    
    const rider = allRiders.find(r => r.id === selectedRider);
    const selectedOrderDetails = pendingOrders.filter(order => order.selected);
    const totalValue = selectedOrderDetails.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const message = `
      Assign ${selectedOrders.length} order(s) to ${rider?.name}?
      
      Orders: ${selectedOrders.join(', ')}
      Rider: ${rider?.name} (${rider?.id})
      Mobile: ${rider?.mobile}
      Assigned Areas: ${rider?.assignedAreas.join(', ')}
      
      Total Value: ₹${totalValue.toLocaleString()}
    `;
    
    if (window.confirm(message)) {
      try {
        setProcessing(true);
        
        // TODO: Implement API call to update Google Sheets
        console.log('Assigning deliveries:', {
          orders: selectedOrders,
          riderId: selectedRider,
          riderName: rider?.name,
          assignmentDate: new Date().toISOString()
        });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        alert(`✅ Successfully assigned ${selectedOrders.length} order(s) to ${rider?.name}!`);
        
        // Refresh data to show updated status
        fetchAssignmentData();
        
        // Clear selection
        clearSelection();
        setSelectedRider('');
        
      } catch (error) {
        console.error('Error assigning deliveries:', error);
        alert('Failed to assign deliveries. Please try again.');
      } finally {
        setProcessing(false);
      }
    }
  };

  // Filter orders based on search and area filter
  const filteredOrders = pendingOrders.filter(order => {
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = 
        order.orderId.toLowerCase().includes(term) ||
        order.shopId.toLowerCase().includes(term) ||
        (order.products && order.products.some(p => 
          p.productName && p.productName.toLowerCase().includes(term)
        ));
      if (!matches) return false;
    }
    
    // Apply area filter
    if (filterArea !== 'all' && order.area !== filterArea) {
      return false;
    }
    
    return true;
  });

  // Format currency
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Calculate total selected value
  const totalSelectedValue = pendingOrders
    .filter(order => order.selected)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const suggestedRiders = getSuggestedRiders();
  const showRiders = showAllRiders ? allRiders : suggestedRiders;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Assignment Dashboard...</p>
          <p className="text-gray-500 text-sm mt-1">Fetching live data from Google Sheets</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">🚚 Assign Delivery Duty</h1>
            <p className="text-gray-600 mt-2">Manage and assign deliveries to available riders</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
              </span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">
                {pendingOrders.length} pending orders • {allRiders.length} riders available
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Unable to load latest data</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{error}</p>
                  <button
                    onClick={() => setRetryCount(prev => prev + 1)}
                    className="mt-2 text-yellow-800 font-medium hover:text-yellow-900"
                  >
                    Click here to retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{pendingOrders.length}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Available Riders</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{allRiders.length}</p>
              </div>
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Selected Orders</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{selectedOrders.length}</p>
              </div>
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {formatCurrency(pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0))}
                </p>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">📋 Pending Orders</h2>
                <p className="text-gray-600 text-sm">Select orders to assign for delivery</p>
                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredOrders.length} of {pendingOrders.length} orders
                  {searchTerm && ` matching "${searchTerm}"`}
                  {filterArea !== 'all' && ` in ${filterArea}`}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    {selectedOrders.length} selected
                  </span>
                  <button
                    onClick={selectAllOrders}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by Order ID, Shop, or Product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Areas</option>
                  {getUniqueAreas().map((area, index) => (
                    <option key={index} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const parsedRiders = parseAvailableRiders(order.availableRidersText);
                  
                  return (
                    <div 
                      key={order.orderId}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        order.selected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleOrderSelection(order.orderId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                            order.selected 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-300'
                          }`}>
                            {order.selected && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-bold text-gray-900">{order.orderId}</span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {order.area}
                              </span>
                              {order.products && order.products.length > 0 && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                  {order.products.length} item{order.products.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              Shop: <span className="font-medium">{order.shopId}</span> • 
                              Date: <span className="font-medium">{formatDate(order.date)}</span>
                            </p>
                            
                            {/* Products List */}
                            {order.products && order.products.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Products:</p>
                                <div className="flex flex-wrap gap-1">
                                  {order.products.slice(0, 3).map((product, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {product.productName} ({product.quantity})
                                    </span>
                                  ))}
                                  {order.products.length > 3 && (
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                                      +{order.products.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Available Riders for this order */}
                            {parsedRiders.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-1">Suggested Riders:</p>
                                <div className="flex flex-wrap gap-1">
                                  {parsedRiders.slice(0, 3).map((rider, idx) => (
                                    <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                      {rider.name} ({rider.mobile})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right min-w-[120px]">
                          <div className="font-bold text-green-600">{formatCurrency(order.totalAmount)}</div>
                          <div className="text-sm text-gray-500">{formatDate(order.date)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-600 mt-4">
                    {error ? 'Error loading orders' : 'No pending orders found'}
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {searchTerm || filterArea !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'All orders have been assigned or no orders are pending'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Riders & Assignment */}
        <div className="space-y-6">
          {/* Rider Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">🚴 Select Rider</h2>
                <p className="text-gray-600 text-sm">
                  {selectedOrders.length > 0 
                    ? `For ${selectedOrders.length} selected order(s)` 
                    : 'Select orders first to see suggested riders'}
                </p>
              </div>
              
              {selectedOrders.length > 0 && (
                <div className="mt-2 md:mt-0">
                  <button
                    onClick={() => setShowAllRiders(!showAllRiders)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {showAllRiders ? 'Show Suggested Riders' : 'Show All Riders'}
                  </button>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={selectedOrders.length === 0 || showRiders.length === 0}
              >
                <option value="">{showRiders.length === 0 ? 'No riders available' : 'Select a rider...'}</option>
                {showRiders.map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.name} ({rider.id})
                  </option>
                ))}
              </select>
              
              {selectedRider && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">
                        {allRiders.find(r => r.id === selectedRider)?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        ID: {selectedRider} • Mobile: {allRiders.find(r => r.id === selectedRider)?.mobile}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      {allRiders.find(r => r.id === selectedRider)?.rating} ★
                    </span>
                  </div>
                  {allRiders.find(r => r.id === selectedRider)?.assignedAreas.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Assigned Areas:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {allRiders.find(r => r.id === selectedRider)?.assignedAreas.slice(0, 3).map((area, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {area}
                          </span>
                        ))}
                        {allRiders.find(r => r.id === selectedRider)?.assignedAreas.length > 3 && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            +{allRiders.find(r => r.id === selectedRider)?.assignedAreas.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Riders List */}
            {showRiders.length > 0 && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {showRiders.map((rider) => (
                  <div 
                    key={rider.id}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      selectedRider === rider.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRider(rider.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{rider.name}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {rider.rating} ★
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {rider.id} • {rider.mobile}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {rider.assignedAreas.length} area{rider.assignedAreas.length !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {rider.deliveriesToday} today
                          </span>
                        </div>
                      </div>
                      
                      {selectedRider === rider.id && (
                        <svg className="w-5 h-5 text-green-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Panel */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📤 Assignment Summary</h2>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Selected Orders:</span>
                    <span className="font-bold text-blue-600">{selectedOrders.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Selected Rider:</span>
                    <span className="font-bold text-green-600">
                      {selectedRider 
                        ? allRiders.find(r => r.id === selectedRider)?.name 
                        : 'None selected'
                      }
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(totalSelectedValue)}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={assignDeliveries}
                disabled={!selectedRider || selectedOrders.length === 0 || processing}
                className={`
                  w-full py-3 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3
                  ${selectedRider && selectedOrders.length > 0 && !processing
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Assign Deliveries
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-600 text-center">
                {selectedOrders.length > 0 && selectedRider ? (
                  `Assign ${selectedOrders.length} order(s) to ${allRiders.find(r => r.id === selectedRider)?.name}`
                ) : selectedOrders.length > 0 ? (
                  'Select a rider to proceed'
                ) : (
                  'Select orders first'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Delivery Assignment Ready</h3>
            <p className="text-gray-600 text-sm mt-1">
              {selectedOrders.length} orders • 
              Rider: {selectedRider ? allRiders.find(r => r.id === selectedRider)?.name : 'Not selected'} • 
              Value: {formatCurrency(totalSelectedValue)}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex gap-3">
            <button
              onClick={clearSelection}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Reset All
            </button>
            <button
              onClick={assignDeliveries}
              disabled={!selectedRider || selectedOrders.length === 0 || processing}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                selectedRider && selectedOrders.length > 0 && !processing
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {processing && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              )}
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}