// src/pages/Delivery.jsx - UPDATED TO FETCH LIVE DATA FROM GOOGLE SHEETS
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Delivery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Stats calculated from data
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    partialReturn: 0,
    fullyReturned: 0,
    failed: 0,
    pending: 0,
    totalCash: 0,
    returnsCount: 0,
    successRate: 0,
    recentDeliveries: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    riderId: "all",
    dateFrom: "",
    dateTo: "",
    shopId: "",
    area: "all",
    cashRange: "all",
    hasReturns: "all"
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    } else {
      // Load data from API
      fetchDeliveryData();
    }
  }, [user, navigate]);

  // Fetch delivery data from Google Sheets API
const fetchDeliveryData = useCallback(async () => {
  setLoading(true);
  setError('');
  
  try {
    console.log('📡 Fetching delivery data from API...');
    
    // Fetch data from your local API endpoint
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/read/Dilivery-History`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ API Response received:', result);
    
    // Extract data from the response object
    if (!result || !result.success) {
      throw new Error('API returned unsuccessful response');
    }
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('Invalid data format: data property is not an array');
    }
    
    // Process the Google Sheets data
    const processedDeliveries = processGoogleSheetsData(result.data);
    setDeliveries(processedDeliveries);
    calculateStats(processedDeliveries);
    setLastRefresh(new Date(result.timestamp || new Date()));
    
    console.log('✅ Successfully loaded delivery data:', processedDeliveries.length, 'deliveries');
    console.log('📊 Stats:', {
      total: processedDeliveries.length,
      delivered: processedDeliveries.filter(d => d.status === "Delivered").length,
      totalCash: processedDeliveries.reduce((sum, d) => sum + (d.cash_received || 0), 0)
    });
    
  } catch (err) {
    console.error('❌ Error fetching delivery data:', err);
    setError(`Failed to load delivery data: ${err.message}`);
    
    // Fallback to empty array
    setDeliveries([]);
    calculateStats([]);
  } finally {
    setLoading(false);
  }
}, []);

  // Process Google Sheets data from API
const processGoogleSheetsData = (rawData) => {
  console.log('Processing raw data:', rawData);
  
  if (!Array.isArray(rawData) || rawData.length < 2) {
    console.warn('Invalid or empty data received');
    return [];
  }
  
  const headers = rawData[0];
  const rows = rawData.slice(1);
  
  // Find column indices (handle various header formats)
  const findIndex = (possibleNames) => {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => 
        h && h.toString().trim().toLowerCase() === name.toLowerCase()
      );
      if (index !== -1) return index;
    }
    return -1;
  };
  
  const dateIndex = findIndex(['Date', 'date', 'DATE']);
  const timeIndex = findIndex(['Time', 'time', 'TIME']);
  const orderIdIndex = findIndex(['Order-Id', 'Order Id', 'Order ID', 'order-id']);
  const shopIdIndex = findIndex(['Shop_Id', 'Shop Id', 'Shop ID', 'shop-id']);
  const riderIdIndex = findIndex(['Rider-Id', 'Rider Id', 'Rider ID', 'rider-id']);
  const riderNameIndex = findIndex(['Rider_Name', 'Rider Name', 'Rider Name', 'rider-name']);
  const cashReceivedIndex = findIndex(['Cash-Recieved', 'Cash Received', 'Cash', 'cash']);
  const orderStatusIndex = findIndex(['Order_status', 'Order Status', 'Status', 'status']);
  const returnItemsIndex = findIndex(['Return_Items', 'Return Items', 'Returns', 'returns']);
  
  console.log('Column indices found:', {
    dateIndex, timeIndex, orderIdIndex, shopIdIndex,
    riderIdIndex, riderNameIndex, cashReceivedIndex,
    orderStatusIndex, returnItemsIndex
  });
  
  const processedDeliveries = [];
  
  rows.forEach((row, index) => {
    try {
      if (!row || row.length === 0) {
        console.warn(`Row ${index} is empty, skipping`);
        return;
      }
      
      // Get values with fallbacks
      const date = dateIndex !== -1 && row[dateIndex] ? row[dateIndex].toString().trim() : '';
      const time = timeIndex !== -1 && row[timeIndex] ? row[timeIndex].toString().trim() : '';
      const orderId = orderIdIndex !== -1 && row[orderIdIndex] ? row[orderIdIndex].toString().trim() : `ORD-${Date.now()}-${index}`;
      const shopId = shopIdIndex !== -1 && row[shopIdIndex] ? row[shopIdIndex].toString().trim() : '';
      const riderId = riderIdIndex !== -1 && row[riderIdIndex] ? row[riderIdIndex].toString().trim() : '';
      const riderName = riderNameIndex !== -1 && row[riderNameIndex] ? row[riderNameIndex].toString().trim() : '';
      
      // Parse cash received
      let cashReceived = 0;
      if (cashReceivedIndex !== -1 && row[cashReceivedIndex]) {
        const cashValue = row[cashReceivedIndex];
        if (cashValue !== null && cashValue !== undefined && cashValue !== '') {
          // Remove any currency symbols and commas
          const cleaned = cashValue.toString().replace(/[₹,]/g, '').trim();
          const parsed = parseFloat(cleaned);
          cashReceived = isNaN(parsed) ? 0 : parsed;
        }
      }
      
      const orderStatus = orderStatusIndex !== -1 && row[orderStatusIndex] ? 
        row[orderStatusIndex].toString().trim() : 'Pending';
      
      // Parse return items
      let returnItems = [];
      if (returnItemsIndex !== -1 && row[returnItemsIndex]) {
        const returnItemsString = row[returnItemsIndex];
        
        if (returnItemsString && 
            returnItemsString !== '[]' && 
            returnItemsString.trim() !== '' &&
            returnItemsString !== 'null' &&
            returnItemsString !== 'undefined') {
          try {
            // Handle escaped JSON strings
            let jsonString = returnItemsString;
            
            // If it's already a stringified JSON array
            if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
              // Parse directly
              const parsed = JSON.parse(jsonString);
              returnItems = Array.isArray(parsed) ? parsed : [parsed];
            }
            // Handle escaped quotes (sometimes from Google Sheets)
            else if (jsonString.includes('\\"')) {
              // Unescape the string
              const unescaped = jsonString.replace(/\\"/g, '"');
              const parsed = JSON.parse(unescaped);
              returnItems = Array.isArray(parsed) ? parsed : [parsed];
            }
            else {
              // Try parsing as-is
              const parsed = JSON.parse(jsonString);
              returnItems = Array.isArray(parsed) ? parsed : [parsed];
            }
          } catch (parseError) {
            console.warn(`Could not parse return items for row ${index}:`, returnItemsString, parseError);
            returnItems = [];
          }
        }
      }
      
      // Create timestamp
      let timestamp = '';
      try {
        if (date) {
          let dateStr = date;
          if (time) {
            dateStr += ' ' + time;
          }
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            timestamp = parsedDate.toISOString();
          } else {
            // Fallback to current date
            timestamp = new Date().toISOString();
          }
        } else {
          timestamp = new Date().toISOString();
        }
      } catch (err) {
        console.warn('Date parsing error:', err);
        timestamp = new Date().toISOString();
      }
      
      // Map status
      let status = 'Pending';
      const statusStr = orderStatus.toLowerCase();
      if (statusStr.includes('delivered')) status = 'Delivered';
      else if (statusStr.includes('partial')) status = 'Partial Return';
      else if (statusStr.includes('fully')) status = 'Fully Returned';
      else if (statusStr.includes('failed')) status = 'Failed';
      else if (statusStr.includes('pending')) status = 'Pending';
      
      // Calculate additional metrics
      const deliveryDate = new Date(timestamp);
      const today = new Date();
      const daysAgo = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));
      const isRecent = daysAgo <= 1;
      
      processedDeliveries.push({
        id: index + 1,
        order_id: orderId,
        shop_id: shopId,
        cash_received: cashReceived,
        status: status,
        timestamp: timestamp,
        rider_id: riderId,
        rider_name: riderName,
        return_items: returnItems,
        return_count: returnItems.length,
        has_returns: returnItems.length > 0,
        date: date,
        time: time,
        original_status: orderStatus,
        days_ago: daysAgo,
        is_recent: isRecent,
        area: 'Unknown'
      });
      
    } catch (rowError) {
      console.error(`Error processing row ${index}:`, rowError, row);
    }
  });
  
  console.log(`Processed ${processedDeliveries.length} deliveries`);
  return processedDeliveries;
};

  // Calculate statistics
  const calculateStats = (data) => {
    const total = data.length;
    const delivered = data.filter(d => d.status === "Delivered").length;
    const partialReturn = data.filter(d => d.status === "Partial Return").length;
    const fullyReturned = data.filter(d => d.status === "Fully Returned").length;
    const failed = data.filter(d => d.status === "Failed").length;
    const pending = data.filter(d => d.status === "Pending").length;
    const totalCash = data.reduce((sum, d) => sum + (d.cash_received || 0), 0);
    const returnsCount = data.reduce((sum, d) => sum + (d.return_count || 0), 0);
    const successRate = total > 0 ? ((delivered + partialReturn) / total) * 100 : 0;
    const recentDeliveries = data.filter(d => d.is_recent).length;
    
    setStats({
      total,
      delivered,
      partialReturn,
      fullyReturned,
      failed,
      pending,
      totalCash,
      returnsCount,
      successRate,
      recentDeliveries
    });
  };

  // Get unique values for filters
  const uniqueRiders = [...new Set(deliveries.map(d => d.rider_id).filter(Boolean))];
  const uniqueShops = [...new Set(deliveries.map(d => d.shop_id).filter(Boolean))];

  // Filter and sort deliveries
  const getFilteredAndSortedDeliveries = () => {
    let filtered = [...deliveries];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(delivery => 
        (delivery.order_id && delivery.order_id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (delivery.shop_id && delivery.shop_id.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (delivery.rider_name && delivery.rider_name.toString().toLowerCase().includes(searchTerm.toLowerCase())) ||
        (delivery.rider_id && delivery.rider_id.toString().toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(delivery => delivery.status === filters.status);
    }
    
    // Apply rider filter
    if (filters.riderId !== "all") {
      filtered = filtered.filter(delivery => delivery.rider_id === filters.riderId);
    }
    
    // Apply shop ID filter
    if (filters.shopId) {
      filtered = filtered.filter(delivery => 
        delivery.shop_id && delivery.shop_id.toString().toLowerCase().includes(filters.shopId.toLowerCase())
      );
    }
    
    // Apply cash range filter
    if (filters.cashRange !== "all") {
      filtered = filtered.filter(delivery => {
        const cash = delivery.cash_received || 0;
        switch(filters.cashRange) {
          case "0": return cash === 0;
          case "1-1000": return cash > 0 && cash <= 1000;
          case "1001-5000": return cash > 1000 && cash <= 5000;
          case "5000+": return cash > 5000;
          default: return true;
        }
      });
    }
    
    // Apply returns filter
    if (filters.hasReturns !== "all") {
      filtered = filtered.filter(delivery => {
        return filters.hasReturns === "yes" ? delivery.has_returns : !delivery.has_returns;
      });
    }
    
    // Apply date filters
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(delivery => {
        const deliveryDate = new Date(delivery.timestamp);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (deliveryDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (deliveryDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortBy) {
        case 'date':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'cash':
          aValue = a.cash_received || 0;
          bValue = b.cash_received || 0;
          break;
        case 'rider':
          aValue = (a.rider_name || '').toLowerCase();
          bValue = (b.rider_name || '').toLowerCase();
          break;
        case 'shop':
          aValue = (a.shop_id || '').toLowerCase();
          bValue = (b.shop_id || '').toLowerCase();
          break;
        case 'status':
          const statusOrder = { 'Delivered': 4, 'Partial Return': 3, 'Pending': 2, 'Failed': 1, 'Fully Returned': 0 };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timestamp;
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return timestamp;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800 border border-green-200';
      case 'Partial Return': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Fully Returned': return 'bg-red-100 text-red-800 border border-red-200';
      case 'Failed': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Pending': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
      riderId: "all",
      dateFrom: "",
      dateTo: "",
      shopId: "",
      area: "all",
      cashRange: "all",
      hasReturns: "all"
    });
    setSearchTerm('');
    setShowAdvancedFilters(false);
  };

  const viewDeliveryDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetails(true);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Order ID', 'Shop ID', 'Date', 'Time', 'Rider Name', 'Rider ID', 'Cash Received', 'Status', 'Return Items Count'];
    const csvData = filteredDeliveries.map(d => [
      d.order_id,
      d.shop_id,
      d.date,
      d.time,
      d.rider_name,
      d.rider_id,
      d.cash_received,
      d.status,
      d.return_count
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliveries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredDeliveries = getFilteredAndSortedDeliveries();

  // Calculate actual statistics from current data
  const calculateActualStats = () => {
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === "Delivered").length;
    const partialReturn = deliveries.filter(d => d.status === "Partial Return").length;
    const totalCash = deliveries.reduce((sum, d) => sum + (d.cash_received || 0), 0);
    const returnsCount = deliveries.reduce((sum, d) => sum + (d.return_count || 0), 0);
    const successRate = total > 0 ? ((delivered + partialReturn) / total) * 100 : 0;
    
    return { total, delivered, partialReturn, totalCash, returnsCount, successRate };
  };

  const actualStats = calculateActualStats();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading delivery data from Google Sheets...</p>
          <p className="text-sm text-gray-500">Fetching data from `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/read/Dilivery-History`</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">🚚 Delivery Management</h1>
                <p className="text-gray-600 text-sm">Live delivery data from Google Sheets</p>
                {lastRefresh && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {lastRefresh.toLocaleTimeString()} • {deliveries.length} deliveries
                  </p>
                )}
                {error && (
                  <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded inline-block">
                    ⚠️ {error}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDeliveryData}
                disabled={loading}
                className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <button 
                  onClick={fetchDeliveryData}
                  className="mt-2 text-red-800 font-medium hover:text-red-900 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {actualStats.total} total
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Total Deliveries</p>
            <p className="text-2xl font-bold text-gray-800">{actualStats.total}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {actualStats.successRate.toFixed(1)}% success
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Delivered</p>
            <p className="text-2xl font-bold text-gray-800">{actualStats.delivered}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                Collected
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Total Cash</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(actualStats.totalCash)}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                Delivery rate
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-gray-800">{actualStats.successRate.toFixed(1)}%</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.000 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {actualStats.partialReturn} orders
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Returns</p>
            <p className="text-2xl font-bold text-gray-800">{actualStats.returnsCount}</p>
          </div>
          
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                On duty
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium mb-1">Active Riders</p>
            <p className="text-2xl font-bold text-gray-800">{uniqueRiders.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Cash Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Total Collected</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(actualStats.totalCash)}</div>
                </div>
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Avg per Delivery</div>
                  <div className="font-bold text-blue-700">
                    {actualStats.total > 0 ? formatCurrency(actualStats.totalCash / actualStats.total) : '₹0'}
                  </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">With Cash</div>
                  <div className="font-bold text-yellow-700">
                    {deliveries.filter(d => d.cash_received > 0).length} orders
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🏆 Top Riders</h3>
            <div className="space-y-3">
              {uniqueRiders.slice(0, 4).map((riderId, index) => {
                const riderDeliveries = deliveries.filter(d => d.rider_id === riderId);
                const riderCash = riderDeliveries.reduce((sum, d) => sum + d.cash_received, 0);
                const riderName = riderDeliveries[0]?.rider_name || riderId;
                const deliveredCount = riderDeliveries.filter(d => d.status === 'Delivered').length;
                
                return (
                  <div key={riderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-800 w-8 h-8 rounded-full flex items-center justify-center font-bold">
                        {riderName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{riderName}</div>
                        <div className="text-xs text-gray-500">{riderId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{formatCurrency(riderCash)}</div>
                      <div className="text-xs text-gray-500">{deliveredCount}/{riderDeliveries.length}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={exportToCSV}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-between transition-colors border"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export to CSV</span>
                </div>
                <span className="text-xs text-gray-500">Excel/Sheets</span>
              </button>
              
              <button
                onClick={() => setFilters({...filters, hasReturns: 'yes'})}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-between transition-colors border"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>View Returns</span>
                </div>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  {actualStats.returnsCount} items
                </span>
              </button>
              
              <button
                onClick={() => setFilters({...filters, status: 'Partial Return'})}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-between transition-colors border"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5" />
                  </svg>
                  <span>Partial Returns</span>
                </div>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  {actualStats.partialReturn}
                </span>
              </button>
              
              <button
                onClick={resetFilters}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 px-4 py-3 rounded-lg flex items-center justify-between transition-colors border"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Reset Filters</span>
                </div>
                <span className="text-xs text-gray-500">Clear all</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by Order ID, Shop ID, Rider Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Delivered">✅ Delivered</option>
                <option value="Partial Return">🔄 Partial Return</option>
                <option value="Fully Returned">❌ Fully Returned</option>
                <option value="Failed">⚠️ Failed</option>
                <option value="Pending">⏳ Pending</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Rider</label>
              <select
                value={filters.riderId}
                onChange={(e) => setFilters({...filters, riderId: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Riders</option>
                {uniqueRiders.map(rider => {
                  const riderData = deliveries.find(d => d.rider_id === rider);
                  return (
                    <option key={rider} value={rider}>
                      {riderData?.rider_name || rider}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Date (Newest)</option>
                <option value="cash">Cash Amount</option>
                <option value="rider">Rider Name</option>
                <option value="shop">Shop ID</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Order</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 p-2.5 border rounded-lg ${sortOrder === 'desc' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'}`}
                >
                  ↓ Desc
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 p-2.5 border rounded-lg ${sortOrder === 'asc' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'}`}
                >
                  ↑ Asc
                </button>
              </div>
            </div>
          </div>
          
          {/* Results info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-bold">{filteredDeliveries.length}</span> of{' '}
                <span className="font-bold">{deliveries.length}</span> deliveries
              </div>
              <div className="mt-2 md:mt-0">
                <div className="text-sm text-gray-500">
                  Success Rate: <span className="font-medium">{actualStats.successRate.toFixed(1)}%</span> • 
                  Total Cash: <span className="font-medium">{formatCurrency(actualStats.totalCash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Delivery Records</h2>
                <p className="text-gray-600 text-sm">
                  Live data from Google Sheets - Dilivery-History
                  {deliveries.length === 0 && ' (No data available)'}
                </p>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="text-sm text-gray-500">
                  Source: Google Sheets • {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              {deliveries.length === 0 ? (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-600">No delivery data available</h3>
                  <p className="mt-1 text-gray-500">
                    Could not load data from Google Sheets. Please check your connection.
                  </p>
                  <button
                    onClick={fetchDeliveryData}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Loading Again
                  </button>
                </>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-600">No deliveries found</h3>
                  <p className="mt-1 text-gray-500">
                    No deliveries match your current filters.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returns</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-200">
                  {filteredDeliveries.map((delivery) => (
                    <tr 
                      key={delivery.id} 
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-gray-900">{delivery.order_id}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {delivery.id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{delivery.shop_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{delivery.rider_name}</div>
                          <div className="text-xs text-gray-500">{delivery.rider_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${delivery.cash_received > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {formatCurrency(delivery.cash_received)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-gray-700 text-sm">{delivery.date}</div>
                          <div className="text-xs text-gray-500">{delivery.time}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {delivery.return_count > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              {delivery.return_count} items
                            </span>
                            <button
                              onClick={() => viewDeliveryDetails(delivery)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewDeliveryDetails(delivery)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {filteredDeliveries.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredDeliveries.length} deliveries • 
                  Total Cash: {formatCurrency(
                    filteredDeliveries.reduce((sum, d) => sum + d.cash_received, 0)
                  )}
                </div>
                <div className="mt-2 md:mt-0 flex gap-3">
                  <button
                    onClick={exportToCSV}
                    className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delivery Details Modal */}
      {showDetails && selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Delivery Details</h3>
                  <p className="text-gray-600">Complete information for Order: {selectedDelivery.order_id}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Order ID</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.order_id}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Shop ID</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.shop_id}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.date}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.time}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Rider Name</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.rider_name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Rider ID</p>
                  <p className="text-base font-medium text-gray-900">{selectedDelivery.rider_id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Financial Information</h4>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600">Cash Received</div>
                        <div className="text-2xl font-bold text-green-700 mt-1">
                          {formatCurrency(selectedDelivery.cash_received)}
                        </div>
                      </div>
                      <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Status Information</h4>
                  <div className={`rounded-lg p-4 ${getStatusColor(selectedDelivery.status)}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Current Status</div>
                        <div className="text-xl font-bold mt-1">{selectedDelivery.status}</div>
                      </div>
                      <div className="text-3xl">
                        {selectedDelivery.status === 'Delivered' ? '✅' : 
                         selectedDelivery.status === 'Partial Return' ? '🔄' : 
                         selectedDelivery.status === 'Fully Returned' ? '❌' : 
                         selectedDelivery.status === 'Failed' ? '⚠️' : '⏳'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* RETURN ITEMS SECTION */}
              {selectedDelivery.return_items && selectedDelivery.return_items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Return Items ({selectedDelivery.return_items.length})
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-red-100 border-b border-red-200">
                      <div className="grid grid-cols-4 gap-4 text-xs font-medium text-red-800">
                        <div>Product ID</div>
                        <div>Quantity</div>
                        <div>Reason</div>
                        <div>Action</div>
                      </div>
                    </div>
                    <div className="divide-y divide-red-100">
                      {selectedDelivery.return_items.map((item, index) => (
                        <div key={index} className="px-4 py-3 hover:bg-red-100">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="font-medium">{item.product_id}</div>
                            <div>{item.qty} units</div>
                            <div>{item.reason}</div>
                            <div>
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.action === 'Restock' ? 'bg-green-100 text-green-800' :
                                item.action === 'Dispose' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.action}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToCSV}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export This
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-8 bg-white border-t">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Delivery Management System</p>
                  <p className="text-gray-500 text-sm">Live Google Sheets Data • Admin Panel</p>
                </div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-600 text-sm">
                Data Source: <span className="font-semibold text-blue-600">Google Sheets API</span>
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {deliveries.length} records • Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
                {error && ' • Error detected'}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}