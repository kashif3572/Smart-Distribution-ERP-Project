// src/utils/sheetsHelper.js
import { sheetsAPI } from '../services/sheetsAPI';

export const sheetsHelper = {
  // Get all data from a sheet with headers
  getSheetData: async (sheetName) => {
    try {
      const response = await sheetsAPI.readSheet(sheetName);
      
      if (!response.data || response.data.length === 0) {
        return { headers: [], rows: [] };
      }
      
      const headers = response.data[0]; // First row as headers
      const rows = response.data.slice(1); // Rest as data rows
      
      return {
        headers,
        rows,
        totalRows: rows.length,
        rawData: response.data
      };
    } catch (error) {
      console.error(`Error getting data from ${sheetName}:`, error);
      throw error;
    }
  },

  // Search in sheet data
  searchInSheet: async (sheetName, searchTerm, columnIndex = null) => {
    const { headers, rows } = await sheetsHelper.getSheetData(sheetName);
    
    if (!searchTerm) {
      return { headers, rows };
    }
    
    const filteredRows = rows.filter(row => {
      if (columnIndex !== null && columnIndex >= 0) {
        // Search in specific column
        return row[columnIndex]?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      } else {
        // Search in all columns
        return row.some(cell => 
          cell?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    });
    
    return {
      headers,
      rows: filteredRows,
      totalRows: filteredRows.length,
      searchTerm
    };
  },

  // Get dashboard summary
  getDashboardSummary: async () => {
    const sheetNames = ['Customers_DB', 'Product_Inventory', 'Sales_Orders_Log', 'Staff_Master'];
    
    const promises = sheetNames.map(sheetName => 
      sheetsAPI.readSheet(sheetName, { limit: 1 }).catch(() => ({ totalRows: 0 }))
    );
    
    const results = await Promise.all(promises);
    
    return {
      customers: results[0].totalRows > 0 ? results[0].totalRows - 1 : 0,
      products: results[1].totalRows > 0 ? results[1].totalRows - 1 : 0,
      orders: results[2].totalRows > 0 ? results[2].totalRows - 1 : 0,
      staff: results[3].totalRows > 0 ? results[3].totalRows - 1 : 0
    };
  }
};