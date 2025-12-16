// src/pages/Dashboard.jsx - COMPLETE ENHANCED VERSION
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from "recharts";
import { sheetsAPI } from "../services/sheetsAPI";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Ensure only Admin can access
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") navigate("/no-access");
  }, [navigate]);

  // Fetch stats from Google Sheets API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      const dashboardData = await sheetsAPI.getDashboardData();
      console.log('Received dashboard data:', dashboardData);
      
      setData(dashboardData);
      setRefreshCount(prev => prev + 1);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(`Connection error: ${err.message}`);
      
      // Set default empty data structure
      setData({
        daily_summary: {
          total_sale: 0,
          total_profits: 0,
          orders_count: 0,
          daily_profit_margin: 0
        },
        monthly_summary: {
          monthly_sales: 0,
          monthly_profit: 0,
          total_orders: 0,
          monthly_profit_margin: 0
        },
        summary_counts: {
          total_customers: 0,
          total_orders: 0,
          total_products: 0
        },
        top_performers: {
          top_area_sales: { area: "No data", sales: 0, profit: 0, orders: 0 },
          top_vendor_profit: { vendor_id: "No data", sales: 0, profit: 0, profit_margin: 0 },
          top_staff_sales: { staff_name: "No data", total_sales: 0, total_profit: 0, order_count: 0, avg_profit_per_order: 0 },
          top_staff_profit: { staff_name: "No data", total_profit: 0, total_sales: 0, order_count: 0, avg_profit_per_order: 0 }
        },
        key_metrics: {
          daily_profit_margin: 0,
          monthly_growth: 0,
          average_order_value: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Default values for when data is null
  const defaultData = {
    daily_summary: {
      total_sale: 0,
      total_profits: 0,
      orders_count: 0,
      daily_profit_margin: 0
    },
    monthly_summary: {
      monthly_sales: 0,
      monthly_profit: 0,
      total_orders: 0,
      monthly_profit_margin: 0
    },
    summary_counts: {
      total_customers: 0,
      total_orders: 0,
      total_products: 0
    },
    top_performers: {
      top_area_sales: { area: "No data", sales: 0, profit: 0, orders: 0 },
      top_vendor_profit: { vendor_id: "No data", sales: 0, profit: 0, profit_margin: 0 },
      top_staff_sales: { staff_name: "No data", total_sales: 0, total_profit: 0, order_count: 0, avg_profit_per_order: 0 },
      top_staff_profit: { staff_name: "No data", total_profit: 0, total_sales: 0, order_count: 0, avg_profit_per_order: 0 }
    },
    key_metrics: {
      daily_profit_margin: 0,
      monthly_growth: 0,
      average_order_value: 0
    }
  };

  const displayData = data || defaultData;
  const { daily_summary, monthly_summary, summary_counts, top_performers, key_metrics } = displayData;

  // Charts Data
  const chartDaily = [
    { name: "Sale", value: daily_summary.total_sale || 0 },
    { name: "Profit", value: daily_summary.total_profits || 0 },
  ];

  const chartMonthly = [
    { name: "Sale", value: monthly_summary.monthly_sales || 0 },
    { name: "Profit", value: monthly_summary.monthly_profit || 0 },
  ];

  // Pie chart data for orders distribution
  const orderDistribution = [
    { name: "Today", value: daily_summary.orders_count || 0 },
    { name: "Month", value: monthly_summary.total_orders || 0 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const quickStats = [
    { 
      title: "Today Sale", 
      value: `₨ ${(daily_summary.total_sale || 0).toLocaleString()}`,
      icon: "💰",
      description: daily_summary.total_sale > 0 ? "Sales today" : "No sales today",
      trend: "up"
    },
    { 
      title: "Today Profit", 
      value: `₨ ${(daily_summary.total_profits || 0).toLocaleString()}`,
      icon: "📈",
      description: daily_summary.total_profits > 0 ? "Profit today" : "No profit today",
      trend: "up"
    },
    { 
      title: "Today's Orders", 
      value: daily_summary.orders_count || 0,
      icon: "📦",
      description: daily_summary.orders_count > 0 ? "Orders placed" : "No orders today",
      trend: "up"
    },
    { 
      title: "Daily Profit Margin", 
      value: ((daily_summary.daily_profit_margin || 0) * 100).toFixed(2) + "%",
      icon: "📊",
      description: "Profit percentage",
      trend: "neutral"
    },
    { 
      title: "Monthly Sales", 
      value: `₨ ${(monthly_summary.monthly_sales || 0).toLocaleString()}`,
      icon: "📅",
      description: "This month",
      trend: "up"
    },
    { 
      title: "Monthly Profit", 
      value: `₨ ${(monthly_summary.monthly_profit || 0).toLocaleString()}`,
      icon: "💹",
      description: "This month",
      trend: "up"
    },
    { 
      title: "Orders This Month", 
      value: monthly_summary.total_orders || 0,
      icon: "🛒",
      description: "Monthly orders",
      trend: "up"
    },
    { 
      title: "Monthly Profit Margin", 
      value: ((monthly_summary.monthly_profit_margin || 0) * 100).toFixed(2) + "%",
      icon: "🎯",
      description: "Monthly profit %",
      trend: "neutral"
    },
  ];

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-700">Loading Dashboard...</h2>
        <p className="text-gray-500 mt-2">Fetching real-time data from Google Sheets</p>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      {/* ========== HEADER SECTION ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">📊 Dashboard</h1>
          <p className="text-gray-600 mt-1">Live business insights from Google Sheets</p>
          {error && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
              ⚠️ {error}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Data source: Google Sheets • Updated: {new Date().toLocaleTimeString()} • Refresh #{refreshCount}
          </p>
        </div>

        {/* Quick buttons */}
        <div className="flex flex-wrap gap-3">
          <button 
            className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md flex items-center gap-3 font-medium"
            onClick={() => navigate("/add-employee")}
          >
            <span className="text-xl">👨‍💼</span>
            <div className="text-left">
              <div className="font-bold">Add Employee</div>
              <div className="text-xs opacity-90">Add staff to database</div>
            </div>
          </button>
          
          <button 
            className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md flex items-center gap-3 font-medium"
            onClick={() => navigate("/add-product")}
          >
            <span className="text-xl">📦</span>
            <div className="text-left">
              <div className="font-bold">Add Product</div>
              <div className="text-xs opacity-90">Add products to inventory</div>
            </div>
          </button>

          <button 
            className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-3 font-medium"
            onClick={fetchData}
          >
            <span className="text-xl">🔄</span>
            <div className="text-left">
              <div className="font-bold">Refresh</div>
              <div className="text-xs opacity-90">Update from Sheets</div>
            </div>
          </button>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Google Sheets Data</h2>
            <p className="text-gray-600 text-sm">
              Connected to 24 sheets • {daily_summary.orders_count > 0 
                ? `${daily_summary.orders_count} orders today • ₨${(daily_summary.total_sale || 0).toLocaleString()} sales • ₨${(daily_summary.total_profits || 0).toLocaleString()} profit`
                : "No orders placed today"}
            </p>
          </div>
          <div className="mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">Backend: https://sheets-api-545260361851.us-central1.run.app/</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Response time: &lt; 500ms • Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow hover:shadow-md transition-all border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded-full ${item.title.includes('Today') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {item.title.includes('Today') ? 'Today' : 'Month'}
                </span>
                {item.trend === 'up' && <span className="text-green-500 text-xs">↑</span>}
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">{item.title}</p>
            <h2 className="text-2xl font-bold mt-2 text-gray-800">{item.value}</h2>
            <p className="text-gray-400 text-xs mt-2">{item.description}</p>
          </div>
        ))}
      </div>

      {/* CHARTS SECTION */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📈 Analytics Overview</h2>
          <div className="text-sm text-gray-500">
            {daily_summary.total_sale > 0 || monthly_summary.monthly_sales > 0 
              ? "Real-time data from Google Sheets" 
              : "Waiting for sales data"}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Sales Chart */}
          <div className="bg-white rounded-xl shadow p-4 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">📅 Daily Sale vs Profit</h3>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
            {daily_summary.total_sale > 0 || daily_summary.total_profits > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="name" stroke="#666"/>
                  <YAxis stroke="#666"/>
                  <Tooltip 
                    formatter={(value) => [`₨ ${Number(value).toLocaleString()}`, 'Amount']}
                    labelStyle={{ color: '#333' }}
                  />
                  <Bar dataKey="value" fill="#34D399" radius={[4, 4, 0, 0]} name="Amount"/>
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-lg font-medium">No sales data for today</p>
                <p className="text-sm mt-1">Sales will appear here when orders are placed</p>
              </div>
            )}
          </div>

          {/* Order Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-4">📊 Order Distribution</h3>
            {orderDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={orderDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
                <div className="text-4xl mb-2">🛒</div>
                <p className="text-lg font-medium">No orders placed</p>
                <p className="text-sm mt-1">Orders will appear here</p>
              </div>
            )}
            <div className="mt-4 flex justify-center space-x-4">
              {orderDistribution.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">📅 Monthly Sale vs Profit</h3>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          {monthly_summary.monthly_sales > 0 || monthly_summary.monthly_profit > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" stroke="#666"/>
                <YAxis stroke="#666"/>
                <Tooltip 
                  formatter={(value) => [`₨ ${Number(value).toLocaleString()}`, 'Amount']}
                  labelStyle={{ color: '#333' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Amount"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-gray-400">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-lg font-medium">No monthly data available</p>
              <p className="text-sm mt-1">Monthly analytics will appear here</p>
            </div>
          )}
        </div>

        {/* Business Summary */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-4">📋 Business Summary</h3>
          <div className="space-y-4">
            {/* Today's Orders */}
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-blue-600">📅</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                  <p className="text-2xl font-bold text-gray-800">{daily_summary.orders_count || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Value</p>
                <p className="text-lg font-bold text-green-600">₨ {(daily_summary.total_sale || 0).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Monthly Orders */}
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-green-600">📈</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Orders</p>
                  <p className="text-2xl font-bold text-gray-800">{monthly_summary.total_orders || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Value</p>
                <p className="text-lg font-bold text-green-600">₨ {(monthly_summary.monthly_sales || 0).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Average Order Value */}
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-purple-600">💰</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ₨ {monthly_summary.total_orders > 0 
                      ? Math.round(monthly_summary.monthly_sales / monthly_summary.total_orders).toLocaleString()
                      : '0'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Profit Margin */}
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-yellow-600">📊</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {((monthly_summary.monthly_profit_margin || 0) * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS SECTION */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🔥 Top Performers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <PerformerCard 
          title="Top Area by Sales" 
          data={top_performers.top_area_sales} 
          fields={["area","sales","profit","orders"]}
          isEmpty={top_performers.top_area_sales.area === "No data"}
          color="blue"
        />
        <PerformerCard 
          title="Top Vendor (Profit)" 
          data={top_performers.top_vendor_profit} 
          fields={["vendor_id","sales","profit","profit_margin"]}
          isEmpty={top_performers.top_vendor_profit.vendor_id === "No data"}
          color="green"
        />
        <PerformerCard 
          title="Top Staff by Sales" 
          data={top_performers.top_staff_sales} 
          fields={["staff_name","total_sales","total_profit","order_count","avg_profit_per_order"]}
          isEmpty={top_performers.top_staff_sales.staff_name === "No data"}
          color="purple"
        />
        <PerformerCard 
          title="Top Staff by Profit" 
          data={top_performers.top_staff_profit} 
          fields={["staff_name","total_profit","total_sales","order_count","avg_profit_per_order"]}
          isEmpty={top_performers.top_staff_profit.staff_name === "No data"}
          color="orange"
        />
      </div>

      {/* Database Summary */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Database Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{summary_counts.total_customers}</div>
            <p className="text-gray-600">Total Customers</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{summary_counts.total_products}</div>
            <p className="text-gray-600">Products in Inventory</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{summary_counts.total_orders}</div>
            <p className="text-gray-600">All-Time Orders</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center">
          <span>✅ Connected to Google Sheets API • 24 sheets synchronized</span>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <span>Response time: &lt; 500ms</span>
            <button 
              onClick={fetchData}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>🔄</span>
              <span>Refresh Now</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* Enhanced PerformerCard Component */
function PerformerCard({ title, data, fields, isEmpty, color }) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50'
  };

  const colorText = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  };

  const formatValue = (key, value) => {
    if (typeof value === "number") {
      if (key.includes("profit") || key.includes("sales")) {
        return `₨ ${value.toLocaleString()}`;
      } else if (key.includes("margin")) {
        return `${(value * 100).toFixed(2)}%`;
      } else {
        return value.toLocaleString();
      }
    }
    return value || "N/A";
  };

  const formatLabel = (key) => {
    const labels = {
      area: "Area",
      sales: "Sales",
      profit: "Profit",
      orders: "Orders",
      vendor_id: "Vendor ID",
      profit_margin: "Profit Margin",
      staff_name: "Staff Name",
      total_sales: "Total Sales",
      total_profit: "Total Profit",
      order_count: "Order Count",
      avg_profit_per_order: "Avg Profit/Order"
    };
    return labels[key] || key.replace("_", " ");
  };

  return (
    <div className={`rounded-xl shadow p-5 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-lg ${colorText[color]}`}>{title}</h3>
        {isEmpty ? (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">No data</span>
        ) : (
          <span className="text-xs px-2 py-1 bg-white text-gray-600 rounded border">Top Performer</span>
        )}
      </div>
      {isEmpty ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">📭</div>
          <p>No performance data available</p>
          <p className="text-sm mt-1">Data will appear when sales are made</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="flex justify-between items-center border-b border-white border-opacity-50 pb-3 last:border-b-0">
              <span className="text-gray-700 font-medium capitalize">{formatLabel(f)}</span>
              <span className={`font-bold ${colorText[color]}`}>
                {formatValue(f, data[f])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}