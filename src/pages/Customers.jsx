// src/pages/Customers.jsx - FINAL VERSION
import React, { useEffect, useState } from 'react';
import { sheetsAPI } from '../services/sheetsAPI';

export default function Customers() {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📞 Fetching customer data from Google Sheets...');
      
      // Fetch customer data from Google Sheets
      const customersData = await sheetsAPI.readSheet('Customers_DB');
      
      if (!customersData.data || customersData.data.length < 2) {
        throw new Error('No customer data found in Google Sheets');
      }
      
      const headers = customersData.data[0];
      const rows = customersData.data.slice(1);
      
      console.log('📊 Customer Headers:', headers);
      console.log('📋 First row:', rows[0]);
      
      // Map column indices based on your exact column names
      const shopIdIndex = headers.indexOf('Shop_ID');
      const shopNameIndex = headers.indexOf('Shop_Name');
      const ownerMobileIndex = headers.indexOf('Owner_Mobile');
      const ownerNameIndex = headers.indexOf('Owner_Name');
      const areaIdIndex = headers.indexOf('Area_ID');
      const creditLimitIndex = headers.indexOf('Credit_Limit');
      const currentBalanceIndex = headers.indexOf('Current_Balance');
      const lastVisitDateIndex = headers.indexOf('Last_Visit_Date');
      
      console.log('📍 Column indices:', {
        shopIdIndex, shopNameIndex, ownerMobileIndex, ownerNameIndex,
        areaIdIndex, creditLimitIndex, currentBalanceIndex, lastVisitDateIndex
      });
      
      // Process customers
      const customers = [];
      const seenShopIds = new Set();
      
      rows.forEach((row, index) => {
        try {
          // Get values with proper defaults
          const shopId = row[shopIdIndex] || `SHOP-${index + 1001}`;
          
          // Skip duplicates
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
          
          // Calculate available limit
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
                now.setHours(0, 0, 0, 0); // Set to start of day
                visitDate.setHours(0, 0, 0, 0);
                
                daysSinceVisit = Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
                isRecentlyVisited = daysSinceVisit <= 7;
                requiresFollowUp = daysSinceVisit > 30;
              }
            } catch (e) {
              console.error('Date parsing error:', e);
            }
          } else {
            requiresFollowUp = true; // Never visited
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
            daysSinceVisit
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
      
      // User-friendly error messages
      if (err.message.includes('No customer data found')) {
        setError('No customer data found in Google Sheets. Check if Customers_DB sheet exists.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Unable to connect to backend server. Make sure it\'s running on http://localhost:5000');
      } else {
        setError(`Failed to load customer data: ${err.message}`);
      }
      
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

  // Fetch data only on mount and when manually refreshed
  useEffect(() => {
    fetchData();
    // Removed auto-refresh interval
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

  const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
  
  // Simple formatting with commas
  const formattedAmount = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${formattedAmount}`;
};

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

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    
    const cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.length === 12) {
      // Format: 923001234567 -> 92-300-1234567
      return cleaned.replace(/(\d{2})(\d{3})(\d{7})/, '$1-$2-$3');
    } else if (cleaned.length === 11) {
      // Format: 3001234567 -> 300-1234567
      return cleaned.replace(/(\d{3})(\d{7})/, '$1-$2');
    } else if (cleaned.length === 10) {
      // Format: 03001234567 -> 300-1234567
      return cleaned.replace(/(\d{3})(\d{7})/, '$1-$2');
    }
    
    return phone;
  };

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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Customer Data...</p>
          <p className="text-gray-400 text-sm mt-1">Fetching from Google Sheets</p>
        </div>
      </div>
    );
  }

  const filteredCustomers = getFilteredAndSortedCustomers();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">🧾 Customer Dashboard</h1>
            <p className="text-gray-600 mt-2">Shop management and customer insights</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                Data source: Google Sheets • 
                {lastRefresh ? ` Last refresh: ${lastRefresh.toLocaleTimeString()}` : ' Not refreshed yet'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-lg ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                title="Grid View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={fetchData}
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
              <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Data loading incomplete</h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Box 
          label="Total Shops" 
          value={data?.summary?.totalShops || 0}
          sublabel={`${data?.uniqueRows || 0} unique entries`}
          icon="🏪"
          isLoading={loading}
        />
        <Box 
          label="Recently Visited" 
          value={data?.summary?.recentlyVisited || 0}
          sublabel="Visited in last 7 days"
          icon="📅"
          isLoading={loading}
        />
        <Box 
          label="Outstanding Accounts" 
          value={data?.summary?.withOutstanding || 0}
          sublabel={formatCurrency(data?.summary?.totalOutstanding || 0)}
          icon="💰"
          isLoading={loading}
          warning={data?.summary?.withOutstanding > 0}
        />
        <Box 
          label="Follow-up Required" 
          value={data?.summary?.requiresFollowUp || 0}
          sublabel="Not visited in 30+ days"
          icon="🔔"
          isLoading={loading}
          warning={data?.summary?.requiresFollowUp > 0}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Shop ID, Name, Owner, Mobile, or Area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="all">All Areas</option>
              {data?.uniqueAreas?.map((area, index) => (
                <option key={index} value={area}>{area}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
            >
              <option value="lastVisit">Sort by Last Visit</option>
              <option value="balance">Sort by Balance</option>
              <option value="name">Sort by Name</option>
              <option value="area">Sort by Area</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 min-w-[80px] justify-center"
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
        
        {/* Results info */}
        <div className="mt-4 flex flex-wrap justify-between items-center text-sm text-gray-600">
          <div>
            Showing {filteredCustomers.length} of {data?.customers?.length || 0} customers
            {searchTerm && ` matching "${searchTerm}"`}
            {filterArea !== 'all' && ` in ${filterArea}`}
          </div>
          <div className="mt-2 md:mt-0">
            {lastRefresh ? `Last refresh: ${lastRefresh.toLocaleTimeString()}` : 'Click refresh to load data'}
          </div>
        </div>
      </div>

      {/* Customer List - Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-800">Customer Database</h2>
                <p className="text-gray-600 text-sm">{data?.customers?.length || 0} customers across {data?.summary?.uniqueAreas || 0} areas</p>
              </div>
              <div className="mt-2 md:mt-0">
                <span className="text-sm text-gray-500">
                  Total outstanding: {formatCurrency(data?.summary?.totalOutstanding || 0)}
                </span>
              </div>
            </div>
          </div>
          
          {filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop ID</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Limit</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                    <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <td className="p-3 md:p-4 font-medium text-gray-900 font-mono text-sm">
                        {customer.shopId}
                      </td>
                      <td className="p-3 md:p-4 font-medium text-gray-700">
                        {customer.shopName}
                      </td>
                      <td className="p-3 md:p-4 text-gray-700">
                        {customer.ownerName}
                      </td>
                      <td className="p-3 md:p-4 text-gray-700 font-mono">
                        {formatPhone(customer.ownerMobile)}
                      </td>
                      <td className="p-3 md:p-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {customer.areaId}
                        </span>
                      </td>
                      <td className="p-3 md:p-4 font-bold">
                        <div className={`${customer.financials.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(customer.financials.currentBalance)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.financials.utilization > 0 ? `${customer.financials.utilization.toFixed(1)}% utilized` : 'No utilization'}
                        </div>
                      </td>
                      <td className="p-3 md:p-4 font-bold text-blue-600">
                        {formatCurrency(customer.financials.creditLimit)}
                      </td>
                      <td className="p-3 md:p-4 text-gray-700">
                        <div>{getDaysSinceVisitText(customer)}</div>
                        {customer.requiresFollowUp && customer.lastVisitDate && (
                          <div className="text-xs text-red-500 mt-1">⚠️ Needs follow-up</div>
                        )}
                      </td>
                      <td className="p-3 md:p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600">
                {searchTerm || filterArea !== 'all' 
                  ? 'No matching customers found' 
                  : 'No customer data available'}
              </h3>
              <p className="text-gray-500 mt-1">
                {searchTerm 
                  ? `No customers found matching "${searchTerm}". Try a different search.`
                  : error 
                    ? 'Please check your connection and try refreshing.'
                    : 'Click "Refresh Data" to load customer information.'
                }
              </p>
              {(searchTerm || filterArea !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterArea('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
          
          {filteredCustomers.length > 0 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredCustomers.length} customers • 
                  Total Outstanding: {formatCurrency(
                    filteredCustomers.reduce((sum, c) => sum + c.financials.currentBalance, 0)
                  )}
                </div>
                <div className="mt-2 md:mt-0 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Export as CSV
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
                    }}
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
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredCustomers.map((customer, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow p-4 md:p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{customer.shopName}</h3>
                  <p className="text-gray-600 text-sm font-mono">{customer.shopId}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                  {customer.status}
                </span>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-gray-700">{customer.ownerName}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-700 font-mono">{formatPhone(customer.ownerMobile)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-700">{customer.areaId}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 text-sm">Balance</span>
                  <span className={`font-bold ${customer.financials.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.financials.currentBalance)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 text-sm">Credit Limit</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(customer.financials.creditLimit)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Last Visit</span>
                  <span className="text-gray-700">
                    {getDaysSinceVisitText(customer)}
                    {customer.requiresFollowUp && (
                      <span className="text-red-500 ml-1">⚠️</span>
                    )}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 text-center text-blue-600 text-sm font-medium">
                Click to view details
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail Modal */}
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
              
              <div className="mt-8 flex justify-end">
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

      {/* Data Source Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-800">Google Sheets Integration</h3>
            <p className="text-gray-600 text-sm">
              Manual refresh only • Data fetched from Customers_DB sheet
            </p>
          </div>
          <div className="mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {error ? 'Connection Error' : 'Connected to Sheets API'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Click "Refresh Data" to update • Response time: &lt; 500ms
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({ label, value, sublabel, icon, isLoading = false, warning = false }) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 md:p-6 transition-all duration-200 hover:shadow-md ${
      warning ? 'border-l-4 border-red-500' : ''
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {warning && !isLoading && (
          <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full">⚠️</span>
        )}
      </div>
      <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
      {isLoading ? (
        <div className="h-8 flex items-center">
          <div className="animate-pulse bg-gray-200 rounded h-6 w-3/4"></div>
        </div>
      ) : (
        <p className={`text-xl md:text-2xl font-bold ${warning ? 'text-red-600' : 'text-gray-800'}`}>
          {value}
        </p>
      )}
      {sublabel && !isLoading && (
        <p className="text-gray-400 text-xs mt-2">{sublabel}</p>
      )}
    </div>
  );
}