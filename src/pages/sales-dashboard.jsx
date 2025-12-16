import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function SalesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0
  });
  const [timeFilter, setTimeFilter] = useState('today'); // today, week, month, all

  // Fetch salesman-specific data when component mounts or user changes
  useEffect(() => {
    if (!user || user.role !== 'sales') {
      navigate('/login');
      return;
    }

    fetchSalesmanOrders();
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchSalesmanOrders, 600000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const fetchSalesmanOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch orders for this specific salesman
      const response = await fetch(
        `https://n8n.edutechpulse.online/webhook/sales-id-order?staffId=${user.id}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOrderData(data.data || []);
        calculateStatistics(data.data || []);
      } else {
        setOrderData([]);
        setStats({
          totalOrders: 0,
          totalAmount: 0,
          pendingOrders: 0,
          completedOrders: 0,
          averageOrderValue: 0
        });
      }
      
    } catch (error) {
      console.error("Error fetching order data:", error);
      // Set empty data on error
      setOrderData([]);
      setStats({
        totalOrders: 0,
        totalAmount: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageOrderValue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (orders) => {
    const totalOrders = orders.length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0);
    const pendingOrders = orders.filter(order => order.Status === 'Pending').length;
    const completedOrders = orders.filter(order => order.Status === 'Delivered' || order.Status === 'Completed').length;
    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

    setStats({
      totalOrders,
      totalAmount,
      pendingOrders,
      completedOrders,
      averageOrderValue
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFilteredOrders = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orderData.filter(order => {
      const orderDate = new Date(order.Date);
      
      switch (timeFilter) {
        case 'today':
          return orderDate >= today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;
        default:
          return true; // 'all'
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your order dashboard...</p>
          <p className="text-gray-400 text-sm mt-1">Fetching your sales data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Sales Dashboard</h1>
                <p className="text-gray-600 text-sm">
                  Welcome, <span className="font-semibold text-blue-600">{user?.name}</span> ({user?.id})
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/sales-order")}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Order
              </button>
              
              <button
                onClick={fetchSalesmanOrders}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Time Filter */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Order Overview</h2>
            <div className="flex space-x-2">
              {['today', 'week', 'month', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 capitalize ${
                    timeFilter === filter
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {filter === 'today' ? 'Today' : 
                   filter === 'week' ? 'This Week' :
                   filter === 'month' ? 'This Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            Showing {filteredOrders.length} orders • {timeFilter === 'today' ? 'from today' : 
            timeFilter === 'week' ? 'from last 7 days' : 
            timeFilter === 'month' ? 'from last 30 days' : 'all orders'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                <h3 className="text-2xl font-bold mt-2">{filteredOrders.length}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {timeFilter === 'today' ? 'Orders placed today' : 
               timeFilter === 'week' ? 'Orders this week' :
               timeFilter === 'month' ? 'Orders this month' : 'Total orders'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Amount</p>
                <h3 className="text-2xl font-bold mt-2">
                  {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0))}
                </h3>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {timeFilter === 'today' ? "Today's sales value" : 
               timeFilter === 'week' ? "This week's sales" :
               timeFilter === 'month' ? "This month's sales" : 'Total sales value'}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending Orders</p>
                <h3 className="text-2xl font-bold mt-2">
                  {filteredOrders.filter(order => order.Status === 'Pending').length}
                </h3>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Awaiting confirmation or delivery
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Avg. Order Value</p>
                <h3 className="text-2xl font-bold mt-2">
                  {filteredOrders.length > 0 
                    ? formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0) / filteredOrders.length)
                    : formatCurrency(0)
                  }
                </h3>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Average amount per order
            </div>
          </div>
        </div>

        {/* Monthly Target Progress (Placeholder) */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Monthly Sales Target</h3>
              <p className="text-gray-600 text-sm">Track your progress towards monthly goals</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0))}
              </div>
              <div className="text-gray-500 text-sm">Achieved so far</div>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {Math.round((filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0) / 100000) * 100)}% 
                of ₹1,00,000 target
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, (filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0) / 100000) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mt-4">
            <span className="font-medium text-blue-600">Tip:</span> You need 
            <span className="font-semibold"> {formatCurrency(Math.max(0, 100000 - filteredOrders.reduce((sum, order) => sum + (order.TotalAmount || 0), 0)))} </span>
            more to reach your monthly target
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
                <p className="text-gray-600 text-sm">Your order history and current status</p>
              </div>
              <div className="mt-2 md:mt-0 text-sm text-gray-500">
                Showing {Math.min(10, filteredOrders.length)} of {filteredOrders.length} orders
              </div>
            </div>
          </div>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-600">No orders found</h3>
              <p className="mt-1 text-gray-500">
                {timeFilter === 'today' ? "You haven't placed any orders today" :
                 timeFilter === 'week' ? "No orders this week" :
                 timeFilter === 'month' ? "No orders this month" : "You haven't placed any orders yet"}
              </p>
              <button
                onClick={() => navigate("/sales-order")}
                className="mt-6 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md"
              >
                Create Your First Order
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop ID</th>
                      <th className="px6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.slice(0, 10).map((order, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{order.OrderID}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">{formatDate(order.Date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700 font-medium">{order.ShopID}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-green-600">{formatCurrency(order.TotalAmount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.Status === 'Delivered' || order.Status === 'Completed' 
                              ? 'bg-green-100 text-green-800' 
                              : order.Status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.Status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.ProofLink ? (
                            <a 
                              href={order.ProofLink} 
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
              
              {filteredOrders.length > 10 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="text-center">
                    <button
                      onClick={() => {/* You can implement pagination here */}}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
                    >
                      Load more orders
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Lifetime Orders</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalOrders}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Lifetime Sales Value</p>
                <h3 className="text-2xl font-bold mt-2">{formatCurrency(stats.totalAmount)}</h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Order Success Rate</p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats.totalOrders > 0 
                    ? `${Math.round(((stats.totalOrders - stats.pendingOrders) / stats.totalOrders) * 100)}%`
                    : '0%'
                  }
                </h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  SD
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Smart Distribution</p>
                  <p className="text-gray-500 text-sm">Sales Portal</p>
                </div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-600 text-sm">
                Logged in as: <span className="font-semibold">{user?.name}</span> ({user?.id})
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}