// src/pages/Orders.jsx - ENHANCED VERSION
import React, { useEffect, useState } from "react";
import { sheetsAPI } from "../services/sheetsAPI";

export default function Orders() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Fetching orders from Google Sheets...");
      
      // Try different possible sheet names for orders
      let ordersData;
      try {
        // First try Sales_Orders_Log
        ordersData = await sheetsAPI.readSheet("Sales_Orders_Log");
      } catch (firstError) {
        console.log("Sales_Orders_Log not found, trying Order-detail-rider...");
        try {
          ordersData = await sheetsAPI.readSheet("Order-detail-rider");
        } catch (secondError) {
          console.log("Order-detail-rider not found, trying Order_Items...");
          ordersData = await sheetsAPI.readSheet("Order_Items");
        }
      }
      
      console.log("Raw orders data:", ordersData);
      
      if (!ordersData.data || ordersData.data.length < 2) {
        throw new Error("No order data found in sheets");
      }
      
      const headers = ordersData.data[0];
      const rows = ordersData.data.slice(1);
      
      console.log("Headers:", headers);
      console.log("Sample row:", rows[0]);
      
      // Find column indices dynamically
      const findColumnIndex = (possibleNames) => {
        for (const name of possibleNames) {
          const index = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes(name.toLowerCase())
          );
          if (index !== -1) return index;
        }
        return -1;
      };
      
      const orderIdIndex = findColumnIndex(["orderid", "order_id", "order no", "id"]);
      const dateIndex = findColumnIndex(["date", "orderdate", "order_date", "created"]);
      const shopIdIndex = findColumnIndex(["shopid", "shop_id", "shop", "customer"]);
      const staffIdIndex = findColumnIndex(["staffid", "staff_id", "staff", "employee"]);
      const amountIndex = findColumnIndex(["total", "amount", "totalamount", "price", "revenue"]);
      const statusIndex = findColumnIndex(["status", "state", "orderstatus"]);
      const proofIndex = findColumnIndex(["proof", "image", "photo", "attachment", "link"]);
      
      console.log("Column indices:", {
        orderIdIndex, dateIndex, shopIdIndex, staffIdIndex,
        amountIndex, statusIndex, proofIndex
      });
      
      // Process orders
      const orders = rows.map((row, index) => {
        // Get today's date for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let orderDate;
        const dateStr = row[dateIndex];
        if (dateStr) {
          orderDate = new Date(dateStr);
          if (isNaN(orderDate.getTime())) {
            // Try parsing as DD-MM-YYYY or other formats
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
              orderDate = new Date(parts[2], parts[1] - 1, parts[0]);
            }
          }
        }
        
        const isToday = orderDate && !isNaN(orderDate.getTime()) 
          ? orderDate >= today 
          : false;
        
        // Format order ID
        const rawOrderId = row[orderIdIndex] || `ORD-${Date.now()}-${index}`;
        const orderId = rawOrderId.toString().startsWith("ORD-") 
          ? rawOrderId 
          : `ORD-${rawOrderId}`;
        
        // Get status with fallback
        let status = row[statusIndex] || "Pending";
        status = status.toString().trim();
        
        return {
          orderId,
          orderDate: dateStr || new Date().toISOString().split('T')[0],
          shopId: row[shopIdIndex] || `SHOP-${index + 1}`,
          staffId: row[staffIdIndex] || `STAFF-${index + 1}`,
          totalAmount: parseFloat(row[amountIndex] || 0),
          status,
          proofLink: row[proofIndex] || null,
          isToday,
          rawData: row // Keep raw data for debugging
        };
      });
      
      // Filter for today's orders
      const todayOrders = orders.filter(order => order.isToday);
      
      // Calculate summary
      const summary = {
        totalOrders: todayOrders.length,
        totalRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        uniqueShops: new Set(todayOrders.map(order => order.shopId)).size,
        uniqueStaffMembers: new Set(todayOrders.map(order => order.staffId)).size,
        allOrders: orders.length,
        allTimeRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
      };
      
      console.log("Processed summary:", summary);
      console.log("Today's orders count:", todayOrders.length);
      
      setData({
        summary,
        orders: todayOrders,
        allOrders: orders, // Keep all orders for filtering
        headers // Store headers for reference
      });
      
    } catch (err) {
      console.error("Error fetching orders:", err);
      
      // User-friendly error messages
      if (err.message.includes("No order data found")) {
        setError("No order data found in Google Sheets. Please check your sheet names.");
      } else if (err.message.includes("Failed to fetch")) {
        setError("Unable to connect to backend server. Make sure it's running on http://localhost:5000");
      } else {
        setError(`Failed to load orders: ${err.message}`);
      }
      
      // Set empty data structure for fallback UI
      setData({
        summary: {
          totalOrders: 0,
          totalRevenue: 0,
          uniqueShops: 0,
          uniqueStaffMembers: 0,
          allOrders: 0,
          allTimeRevenue: 0
        },
        orders: [],
        allOrders: [],
        headers: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
	 // Auto-refresh every 30 seconds
   // const interval = setInterval(fetchOrders, 30000);
  //  return () => clearInterval(interval);
  }, [retryCount]);

  // Filter and sort orders
  const getFilteredAndSortedOrders = () => {
    if (!data?.orders) return [];
    
    let filtered = [...data.orders];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shopId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(order => 
        order.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "date":
          aValue = new Date(a.orderDate);
          bValue = new Date(b.orderDate);
          break;
        case "amount":
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case "id":
          aValue = a.orderId;
          bValue = b.orderId;
          break;
        default:
          aValue = new Date(a.orderDate);
          bValue = new Date(b.orderDate);
      }
      
      if (sortOrder === "desc") {
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
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Try custom format
        return dateString;
      }
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered') || statusLower.includes('completed')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('cancelled') || statusLower.includes('rejected')) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Today's Orders...</p>
          <p className="text-gray-400 text-sm mt-1">Fetching data from Google Sheets</p>
        </div>
      </div>
    );
  }

  const filteredOrders = getFilteredAndSortedOrders();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">📦 Today's Orders</h1>
            <p className="text-gray-600 mt-2">
              Orders placed today - {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Data source: Google Sheets • Updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setRetryCount(prev => prev + 1)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
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
                  <p className="mt-1">Showing cached data or empty state</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Card 
          label="Today's Orders" 
          value={data?.summary?.totalOrders || 0}
          sublabel="Orders placed today"
          icon="📦"
          isLoading={loading && !error}
        />
        <Card 
          label="Today's Revenue" 
          value={formatCurrency(data?.summary?.totalRevenue || 0)}
          sublabel="Total sales today"
          icon="💰"
          isLoading={loading && !error}
        />
        <Card 
          label="Active Shops" 
          value={data?.summary?.uniqueShops || 0}
          sublabel="Shops ordered today"
          icon="🏪"
          isLoading={loading && !error}
        />
        <Card 
          label="Active Staff" 
          value={data?.summary?.uniqueStaffMembers || 0}
          sublabel="Staff involved today"
          icon="👨‍💼"
          isLoading={loading && !error}
        />
      </div>

      {/* All-time Stats */}
      <div className="mb-8 p-4 bg-white rounded-xl shadow">
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-700">📊 All-Time Statistics</h3>
            <p className="text-sm text-gray-500">Total orders in database</p>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 md:mt-0">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{data?.summary?.allOrders || 0}</div>
              <div className="text-sm text-gray-500">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{formatCurrency(data?.summary?.allTimeRevenue || 0)}</div>
              <div className="text-sm text-gray-500">All-Time Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders by ID, Shop, Staff, or Status..."
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="id">Sort by Order ID</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
        
        {/* Results info */}
        <div className="mt-4 flex flex-wrap justify-between items-center text-sm text-gray-600">
          <div>
            Showing {filteredOrders.length} of {data?.orders?.length || 0} today's orders
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
          <div className="mt-2 md:mt-0">
            Last fetched: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Today's Order Details</h2>
              <p className="text-gray-600 text-sm">All orders placed today from Google Sheets</p>
            </div>
            <div className="mt-2 md:mt-0 text-sm text-gray-500">
              {data?.orders?.length || 0} orders • {formatCurrency(data?.summary?.totalRevenue || 0)}
            </div>
          </div>
        </div>
        
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop ID</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-3 md:p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-3 md:p-4 font-medium text-gray-900 font-mono text-sm">
                      {order.orderId}
                    </td>
                    <td className="p-3 md:p-4 text-gray-600">
                      {formatDate(order.orderDate)}
                    </td>
                    <td className="p-3 md:p-4 font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {order.shopId}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 md:p-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {order.staffId}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 md:p-4 font-bold text-green-600">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="p-3 md:p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 md:p-4">
                      {order.proofLink ? (
                        <a 
                          href={order.proofLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No proof</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600">
              {searchTerm || filterStatus !== "all" 
                ? "No matching orders found" 
                : "No orders today"}
            </h3>
            <p className="text-gray-500 mt-1">
              {searchTerm 
                ? `No orders found matching "${searchTerm}". Try a different search term.`
                : error 
                  ? 'Unable to fetch orders. Please check your connection and try again.'
                  : 'No orders have been placed yet today.'
              }
            </p>
            {(searchTerm || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        
        {filteredOrders.length > 0 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredOrders.length} orders • 
                Total: {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0))}
              </div>
              <div className="mt-2 md:mt-0 flex gap-3">
                <button
                  onClick={() => {
                    // Export as CSV
                    const csvContent = [
                      ['Order ID', 'Date', 'Shop ID', 'Staff ID', 'Amount', 'Status', 'Proof Link'],
                      ...filteredOrders.map(o => [
                        o.orderId,
                        o.orderDate,
                        o.shopId,
                        o.staffId,
                        o.totalAmount,
                        o.status,
                        o.proofLink || ''
                      ])
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
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
                
                <button
                  onClick={() => window.print()}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Source Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-800">Google Sheets Integration</h3>
            <p className="text-gray-600 text-sm">
              Data fetched from Google Sheets in real-time • Response time: &lt; 500ms
            </p>
          </div>
          <div className="mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {error ? 'Connection Error' : 'Connected to Sheets API'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ label, value, sublabel, icon, isLoading = false }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 md:p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {isLoading ? (
          <div className="animate-pulse bg-gray-200 rounded h-4 w-16"></div>
        ) : (
          <div className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
            Today
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm font-medium mb-1">{label}</p>
      {isLoading ? (
        <div className="h-8 flex items-center">
          <div className="animate-pulse bg-gray-200 rounded h-6 w-3/4"></div>
        </div>
      ) : (
        <p className="text-xl md:text-2xl font-bold text-gray-800">{value}</p>
      )}
      <p className="text-gray-400 text-xs mt-2">{sublabel}</p>
    </div>
  );
}