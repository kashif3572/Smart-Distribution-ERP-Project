// src/services/sheetsAPI.js - FINAL CORRECTED VERSION WITH ENV VARIABLE
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('API Base URL:', API_BASE); // Debug log - remove in production

const fetchAPI = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error.message);
    throw error;
  }
};
// Helper functions
const extractTopArea = (areaData) => {
  if (!areaData.data || areaData.data.length < 2) {
    return { area: "No data", sales: 0, profit: 0, orders: 0 };
  }
  
  const headers = areaData.data[0];
  const rows = areaData.data.slice(1);
  
  // Match your actual column names
  const areaIndex = headers.findIndex(h => h === 'Area');
  const ordersIndex = headers.findIndex(h => h === 'Orders');
  const salesIndex = headers.findIndex(h => h === 'Area_Sales');
  const profitIndex = headers.findIndex(h => h === 'Area_Profit');
  
  if (rows.length === 0) return { area: "No data", sales: 0, profit: 0, orders: 0 };
  
  // Find top area by sales
  const topRow = rows.reduce((max, row) => {
    const rowSales = salesIndex >= 0 ? parseFloat(row[salesIndex] || 0) : 0;
    const maxSales = salesIndex >= 0 ? parseFloat(max[salesIndex] || 0) : 0;
    return rowSales > maxSales ? row : max;
  }, rows[0]);
  
  return {
    area: areaIndex >= 0 ? topRow[areaIndex] || "Unknown" : "Unknown",
    sales: salesIndex >= 0 ? parseFloat(topRow[salesIndex] || 0) : 0,
    profit: profitIndex >= 0 ? parseFloat(topRow[profitIndex] || 0) : 0,
    orders: ordersIndex >= 0 ? parseInt(topRow[ordersIndex] || 0) : 0
  };
};

const extractTopVendor = (vendorData) => {
  if (!vendorData.data || vendorData.data.length < 2) {
    return { vendor_id: "No data", sales: 0, profit: 0, profit_margin: 0 };
  }
  
  const headers = vendorData.data[0];
  const rows = vendorData.data.slice(1);
  
  // Match your actual column names
  const vendorIndex = headers.findIndex(h => h === 'Vendor_ID');
  const salesIndex = headers.findIndex(h => h === 'Vendor_Sales');
  const profitIndex = headers.findIndex(h => h === 'Vendor_Profit');
  const marginIndex = headers.findIndex(h => h === 'Vendor_Profit_Margin');
  
  if (rows.length === 0) return { vendor_id: "No data", sales: 0, profit: 0, profit_margin: 0 };
  
  // Find top vendor by profit
  const topRow = rows.reduce((max, row) => {
    const rowProfit = profitIndex >= 0 ? parseFloat(row[profitIndex] || 0) : 0;
    const maxProfit = profitIndex >= 0 ? parseFloat(max[profitIndex] || 0) : 0;
    return rowProfit > maxProfit ? row : max;
  }, rows[0]);
  
  return {
    vendor_id: vendorIndex >= 0 ? topRow[vendorIndex] || "Unknown" : "Unknown",
    sales: salesIndex >= 0 ? parseFloat(topRow[salesIndex] || 0) : 0,
    profit: profitIndex >= 0 ? parseFloat(topRow[profitIndex] || 0) : 0,
    profit_margin: marginIndex >= 0 ? parseFloat(topRow[marginIndex] || 0) : 0
  };
};

const extractTopStaff = (staffData, type = 'sales') => {
  if (!staffData.data || staffData.data.length < 2) {
    return { staff_name: "No data", total_sales: 0, total_profit: 0, order_count: 0, avg_profit_per_order: 0 };
  }
  
  const headers = staffData.data[0];
  const rows = staffData.data.slice(1);
  
  // Match your actual column names
  const nameIndex = headers.findIndex(h => h === 'Staff_Name');
  const salesIndex = headers.findIndex(h => h === 'Total_Sales');
  const profitIndex = headers.findIndex(h => h === 'Total_Profit');
  const ordersIndex = headers.findIndex(h => h === 'Order_Count');
  const avgProfitIndex = headers.findIndex(h => h === 'Avg_Profit_Per_Order');
  
  if (rows.length === 0) return { staff_name: "No data", total_sales: 0, total_profit: 0, order_count: 0, avg_profit_per_order: 0 };
  
  const topRow = type === 'sales' 
    ? rows.reduce((max, row) => {
        const rowSales = salesIndex >= 0 ? parseFloat(row[salesIndex] || 0) : 0;
        const maxSales = salesIndex >= 0 ? parseFloat(max[salesIndex] || 0) : 0;
        return rowSales > maxSales ? row : max;
      }, rows[0])
    : rows.reduce((max, row) => {
        const rowProfit = profitIndex >= 0 ? parseFloat(row[profitIndex] || 0) : 0;
        const maxProfit = profitIndex >= 0 ? parseFloat(max[profitIndex] || 0) : 0;
        return rowProfit > maxProfit ? row : max;
      }, rows[0]);
  
  return {
    staff_name: nameIndex >= 0 ? topRow[nameIndex] || "Unknown" : "Unknown",
    total_sales: salesIndex >= 0 ? parseFloat(topRow[salesIndex] || 0) : 0,
    total_profit: profitIndex >= 0 ? parseFloat(topRow[profitIndex] || 0) : 0,
    order_count: ordersIndex >= 0 ? parseInt(topRow[ordersIndex] || 0) : 0,
    avg_profit_per_order: avgProfitIndex >= 0 ? parseFloat(topRow[avgProfitIndex] || 0) : 0
  };
};

const getDefaultTopPerformers = () => ({
  top_area_sales: { area: "No data", sales: 0, profit: 0, orders: 0 },
  top_vendor_profit: { vendor_id: "No data", sales: 0, profit: 0, profit_margin: 0 },
  top_staff_sales: { staff_name: "No data", total_sales: 0, total_profit: 0, order_count: 0, avg_profit_per_order: 0 },
  top_staff_profit: { staff_name: "No data", total_profit: 0, total_sales: 0, order_count: 0, avg_profit_per_order: 0 }
});

export const sheetsAPI = {
  // Test connection
  testConnection: async () => fetchAPI('/'),
  
  // Get all sheets
  getSheets: async () => fetchAPI('/api/sheets'),
  
  // Read sheet data
  readSheet: async (sheetName, options = {}) => {
    const { range = "A1:Z1000", page, limit } = options;
    let url = `/api/read/${sheetName}?range=${range}`;
    
    if (page) url += `&page=${page}`;
    if (limit) url += `&limit=${limit}`;
    
    return fetchAPI(url);
  },

  // ==================== DASHBOARD SPECIFIC FUNCTIONS ====================
  
  // Get daily summary (from Daily_Summary sheet)
  getDailySummary: async () => {
    try {
      const data = await fetchAPI('/api/read/Daily_Summary');
      
      if (!data.data || data.data.length < 2) {
        return {
          total_sale: 0,
          total_profits: 0,
          orders_count: 0,
          daily_profit_margin: 0
        };
      }
      
      const headers = data.data[0];
      const todayData = data.data[1];
      
      // Match your actual column names
      const saleIndex = headers.findIndex(h => h === 'Total_Sale');
      const profitIndex = headers.findIndex(h => h === 'Total_Profits');
      const ordersIndex = headers.findIndex(h => h === 'Orders_Count');
      
      const totalSale = saleIndex >= 0 ? parseFloat(todayData[saleIndex] || 0) : 0;
      const totalProfit = profitIndex >= 0 ? parseFloat(todayData[profitIndex] || 0) : 0;
      
      return {
        total_sale: totalSale,
        total_profits: totalProfit,
        orders_count: ordersIndex >= 0 ? parseInt(todayData[ordersIndex] || 0) : 0,
        daily_profit_margin: totalSale > 0 ? (totalProfit / totalSale) : 0
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return {
        total_sale: 0,
        total_profits: 0,
        orders_count: 0,
        daily_profit_margin: 0
      };
    }
  },

  // Get monthly summary (from Monthly_Summary sheet)
  getMonthlySummary: async () => {
    try {
      const data = await fetchAPI('/api/read/Monthly_Summary');
      
      if (!data.data || data.data.length < 2) {
        return {
          monthly_sales: 0,
          monthly_profit: 0,
          total_orders: 0,
          monthly_profit_margin: 0
        };
      }
      
      const headers = data.data[0];
      const monthlyData = data.data[1];
      
      // Match your actual column names
      const salesIndex = headers.findIndex(h => h === 'Monthly_Sales');
      const profitIndex = headers.findIndex(h => h === 'Monthly_Profit');
      const ordersIndex = headers.findIndex(h => h === 'Total_Orders');
      const marginIndex = headers.findIndex(h => h === 'Monthly_Profit_Margin');
      
      const monthlySales = salesIndex >= 0 ? parseFloat(monthlyData[salesIndex] || 0) : 0;
      const monthlyProfit = profitIndex >= 0 ? parseFloat(monthlyData[profitIndex] || 0) : 0;
      
      return {
        monthly_sales: monthlySales,
        monthly_profit: monthlyProfit,
        total_orders: ordersIndex >= 0 ? parseInt(monthlyData[ordersIndex] || 0) : 0,
        monthly_profit_margin: marginIndex >= 0 ? parseFloat(monthlyData[marginIndex] || 0) : 0
      };
    } catch (error) {
      console.error('Error getting monthly summary:', error);
      return {
        monthly_sales: 0,
        monthly_profit: 0,
        total_orders: 0,
        monthly_profit_margin: 0
      };
    }
  },

  // Get summary counts (from multiple sheets) - FINAL WORKING VERSION
getSummaryCounts: async () => {
  try {
    // Fetch ALL data (no limit parameter)
    const [customers, products, orders] = await Promise.all([
      fetchAPI('/api/read/Customers_DB'),
      fetchAPI('/api/read/Product_Inventory'),
      fetchAPI('/api/read/Sales_Orders_Log')
    ]);
    
    // Count rows excluding header (row 0)
    const total_customers = customers.data ? customers.data.length - 1 : 0;
    const total_products = products.data ? products.data.length - 1 : 0;
    const total_orders = orders.data ? orders.data.length - 1 : 0;
    
    return {
      total_customers,
      total_products,
      total_orders
    };
  } catch (error) {
    console.error('Error getting summary counts:', error);
    return {
      total_customers: 0,
      total_products: 0,
      total_orders: 0
    };
  }
},

  // Get top performers
  getTopPerformers: async () => {
    try {
      const [areaData, vendorData, staffData] = await Promise.all([
        fetchAPI('/api/read/Area_Summary?limit=10'),
        fetchAPI('/api/read/Vendor_Summary?limit=10'),
        fetchAPI('/api/read/Staff_Summary?limit=10')
      ]);

      const topArea = extractTopArea(areaData);
      const topVendor = extractTopVendor(vendorData);
      const topStaffSales = extractTopStaff(staffData, 'sales');
      const topStaffProfit = extractTopStaff(staffData, 'profit');

      return {
        top_area_sales: topArea,
        top_vendor_profit: topVendor,
        top_staff_sales: topStaffSales,
        top_staff_profit: topStaffProfit
      };
    } catch (error) {
      console.error('Error fetching top performers:', error);
      return getDefaultTopPerformers();
    }
  },

  // Get all dashboard data at once
  getDashboardData: async () => {
    try {
      const [dailySummary, monthlySummary, summaryCounts, topPerformers] = await Promise.all([
        sheetsAPI.getDailySummary(),
        sheetsAPI.getMonthlySummary(),
        sheetsAPI.getSummaryCounts(),
        sheetsAPI.getTopPerformers()
      ]);

      // Calculate key metrics
      const key_metrics = {
        daily_profit_margin: dailySummary.daily_profit_margin || 0,
        monthly_growth: 0,
        average_order_value: monthlySummary.total_orders > 0 
          ? monthlySummary.monthly_sales / monthlySummary.total_orders 
          : 0
      };

      return {
        daily_summary: dailySummary,
        monthly_summary: monthlySummary,
        summary_counts: summaryCounts,
        top_performers: topPerformers,
        key_metrics: key_metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
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
        top_performers: getDefaultTopPerformers(),
        key_metrics: {
          daily_profit_margin: 0,
          monthly_growth: 0,
          average_order_value: 0
        }
      };
    }
  }
};