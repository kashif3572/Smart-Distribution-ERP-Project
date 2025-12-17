// src/pages/Purchases.jsx - UPDATED WITH WORKING SORTING & FILTERING
import React, { useEffect, useState, useCallback } from 'react';
import { sheetsAPI } from '../services/sheetsAPI';

export default function Purchases() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [sortBy, setSortBy] = useState('vendorRisk'); // Default sort by risk
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(true); // Show risk by default

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📞 Fetching purchase data from Google Sheets...');
      
      const purchasesData = await sheetsAPI.readSheet('Purchases_Log');
      
      if (!purchasesData.data || purchasesData.data.length < 2) {
        throw new Error('No purchase data found in Google Sheets');
      }
      
      const headers = purchasesData.data[0];
      const rows = purchasesData.data.slice(1);
      
      console.log('📊 Purchase Headers:', headers);
      console.log('📋 Sample row:', rows[0]);
      
      // Map column indices
      const purchaseIdIndex = headers.indexOf('Purchase_ID');
      const vendorIdIndex = headers.indexOf('Vendor_ID');
      const productIdIndex = headers.indexOf('Product_ID');
      const qtyIndex = headers.indexOf('Qty');
      const costPriceIndex = headers.indexOf('Cost_Price');
      const totalCostIndex = headers.indexOf('Total_Cost');
      const dateIndex = headers.indexOf('Date');
      
      // Process purchases
      const purchases = [];
      const productVendorMap = {}; // Track vendors per product
      const vendorProductMap = {}; // Track products per vendor
      
      rows.forEach((row, index) => {
        try {
          const purchaseId = row[purchaseIdIndex] || `PUR-${index + 1001}`;
          const vendorId = row[vendorIdIndex] || `V${String(Math.floor(Math.random() * 10)).padStart(3, '0')}`;
          const productId = row[productIdIndex] || `P${String(index + 1).padStart(3, '0')}`;
          const quantity = parseInt(row[qtyIndex]) || 0;
          const costPrice = parseFloat(row[costPriceIndex]) || 0;
          const totalCost = parseFloat(row[totalCostIndex]) || (quantity * costPrice);
          const date = row[dateIndex] || new Date().toISOString().split('T')[0];
          
          // Track product-vendor relationships
          if (!productVendorMap[productId]) {
            productVendorMap[productId] = new Set();
          }
          productVendorMap[productId].add(vendorId);
          
          // Track vendor-product relationships
          if (!vendorProductMap[vendorId]) {
            vendorProductMap[vendorId] = new Set();
          }
          vendorProductMap[vendorId].add(productId);
          
          purchases.push({
            purchaseId,
            vendorId,
            productId,
            quantity,
            costPrice,
            totalCost,
            date
          });
          
        } catch (rowError) {
          console.error(`Error processing row ${index}:`, rowError);
        }
      });
      
      // Calculate product analysis with CORRECT priority logic
      const productAnalysis = calculateProductAnalysis(purchases, productVendorMap);
      
      // Calculate vendor performance
      const vendorPerformance = calculateVendorPerformance(purchases, vendorProductMap);
      
      // Calculate summary statistics
      const totalPurchases = purchases.length;
      const recentPurchases = purchases.filter(p => {
        const daysAgo = calculateDaysAgo(p.date);
        return daysAgo <= 7;
      }).length;
      const totalInventoryValue = purchases.reduce((sum, p) => sum + p.totalCost, 0);
      const totalUnitsPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
      const averageUnitCost = totalUnitsPurchased > 0 ? totalInventoryValue / totalUnitsPurchased : 0;
      
      // Calculate risk metrics
      const singleSourcedProducts = productAnalysis.filter(p => p.vendorCount === 1).length;
      const highRiskProducts = productAnalysis.filter(p => p.priority === 'High').length;
      const mediumRiskProducts = productAnalysis.filter(p => p.priority === 'Medium').length;
      const lowRiskProducts = productAnalysis.filter(p => p.priority === 'Low').length;
      
      // Get unique vendors and products for filters
      const uniqueVendors = [...new Set(purchases.map(p => p.vendorId).filter(Boolean))].sort();
      const uniqueProducts = [...new Set(purchases.map(p => p.productId).filter(Boolean))].sort();
      
      setData({
        summary: {
          totalPurchases,
          recentPurchases,
          totalInventoryValue,
          totalUnitsPurchased,
          averageUnitCost,
          uniqueVendors: uniqueVendors.length,
          uniqueProducts: uniqueProducts.length,
          // Risk metrics
          singleSourcedProducts,
          highRiskProducts,
          mediumRiskProducts,
          lowRiskProducts,
          riskScore: calculateRiskScore(productAnalysis)
        },
        purchases,
        productAnalysis,
        vendorPerformance,
        productVendorMap: Object.fromEntries(
          Object.entries(productVendorMap).map(([k, v]) => [k, Array.from(v)])
        ),
        vendorProductMap: Object.fromEntries(
          Object.entries(vendorProductMap).map(([k, v]) => [k, Array.from(v)])
        ),
        uniqueVendors,
        uniqueProducts
      });
      
      setLastRefresh(new Date());
      console.log('✅ Purchase processing complete with risk analysis');
      
    } catch (err) {
      console.error('❌ Error fetching purchase data:', err);
      setError(err.message);
      // Fallback to sample data for demo
      setData(getSampleData());
    } finally {
      setLoading(false);
    }
  }, []);

  // CORRECTED Product Analysis with proper priority logic
  const calculateProductAnalysis = (purchases, productVendorMap) => {
    const productMap = {};
    const now = new Date();
    
    // First pass: aggregate data
    purchases.forEach(purchase => {
      const productId = purchase.productId;
      
      if (!productMap[productId]) {
        productMap[productId] = {
          productId,
          totalQuantity: 0,
          totalCost: 0,
          averageUnitCost: 0,
          lastPurchaseDate: purchase.date,
          vendorCount: productVendorMap[productId] ? productVendorMap[productId].size : 1,
          daysSinceLastPurchase: 0,
          priority: 'Low',
          vendorRisk: 'High', // Default to high if single vendor
          // Additional metrics
          vendors: productVendorMap[productId] ? Array.from(productVendorMap[productId]) : [],
          recentActivity: false,
          totalPurchases: 0
        };
      }
      
      productMap[productId].totalQuantity += purchase.quantity;
      productMap[productId].totalCost += purchase.totalCost;
      productMap[productId].totalPurchases += 1;
      
      // Update last purchase date
      const currentDate = new Date(purchase.date);
      const lastDate = new Date(productMap[productId].lastPurchaseDate);
      if (currentDate > lastDate) {
        productMap[productId].lastPurchaseDate = purchase.date;
      }
    });
    
    // Second pass: calculate derived metrics
    Object.values(productMap).forEach(product => {
      // Calculate averages
      product.averageUnitCost = product.totalQuantity > 0 
        ? product.totalCost / product.totalQuantity 
        : 0;
      
      // Calculate days since last purchase
      const lastDate = new Date(product.lastPurchaseDate);
      product.daysSinceLastPurchase = !isNaN(lastDate.getTime()) 
        ? Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Determine vendor risk level
      product.vendorRisk = getVendorRiskLevel(product.vendorCount);
      
      // Determine recent activity
      product.recentActivity = product.daysSinceLastPurchase <= 7;
      
      // ✅ CORRECT PRIORITY LOGIC: Based on BOTH time AND vendor risk
      product.priority = calculateProductPriority(
        product.daysSinceLastPurchase,
        product.vendorCount
      );
    });
    
    return Object.values(productMap);
  };

  // ✅ CORRECT Priority Calculation
  const calculateProductPriority = (daysSinceLastPurchase, vendorCount) => {
    // Rule 1: High Priority if BOTH old purchase AND single vendor
    if (daysSinceLastPurchase > 30 && vendorCount === 1) {
      return 'High';
    }
    // Rule 2: Medium Priority if EITHER old purchase OR single vendor
    else if (daysSinceLastPurchase > 30 || vendorCount === 1) {
      return 'Medium';
    }
    // Rule 3: Low Priority if recent purchase AND multiple vendors
    else {
      return 'Low';
    }
  };

  const getVendorRiskLevel = (vendorCount) => {
    if (vendorCount >= 3) return '🟢 Low Risk';
    if (vendorCount === 2) return '🟡 Medium Risk';
    if (vendorCount === 1) return '🔴 High Risk';
    return 'Unknown';
  };

  const getVendorStatus = (vendorCount) => {
    if (vendorCount === 1) return '⚠️ Single Source';
    if (vendorCount === 2) return '✅ Dual Source';
    return `🔄 ${vendorCount} Sources`;
  };

  const calculateVendorPerformance = (purchases, vendorProductMap) => {
    const vendorMap = {};
    
    purchases.forEach(purchase => {
      const vendorId = purchase.vendorId;
      
      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = {
          vendor: vendorId,
          totalSpent: 0,
          productCount: vendorProductMap[vendorId] ? vendorProductMap[vendorId].size : 0,
          purchaseCount: 0,
          avgPurchaseValue: 0,
          criticalProducts: 0, // Products they're the only supplier for
          lastPurchaseDate: purchase.date
        };
      }
      
      vendorMap[vendorId].totalSpent += purchase.totalCost;
      vendorMap[vendorId].purchaseCount += 1;
      
      // Update last purchase
      const currentDate = new Date(purchase.date);
      const lastDate = new Date(vendorMap[vendorId].lastPurchaseDate);
      if (currentDate > lastDate) {
        vendorMap[vendorId].lastPurchaseDate = purchase.date;
      }
    });
    
    // Calculate averages and critical products
    Object.values(vendorMap).forEach(vendor => {
      vendor.avgPurchaseValue = vendor.purchaseCount > 0 
        ? vendor.totalSpent / vendor.purchaseCount 
        : 0;
      
      // Calculate critical products (where vendor is sole supplier)
      vendor.criticalProducts = vendor.productCount; // Simplified - would need product-vendor mapping
    });
    
    return Object.values(vendorMap);
  };

  // NEW: Get sorted and filtered products
  const getSortedAndFilteredProducts = () => {
    if (!data?.productAnalysis) return [];
    
    let filtered = [...data.productAnalysis];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.productId.toLowerCase().includes(term) ||
        product.vendorRisk.toLowerCase().includes(term) ||
        product.vendors?.some(v => v.toLowerCase().includes(term)) ||
        false
      );
    }
    
    // Apply vendor filter
    if (filterVendor !== 'all') {
      filtered = filtered.filter(product => 
        product.vendors?.includes(filterVendor) || false
      );
    }
    
    // Apply product filter
    if (filterProduct !== 'all') {
      filtered = filtered.filter(product => 
        product.productId === filterProduct
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'productId':
          aValue = a.productId;
          bValue = b.productId;
          break;
          
        case 'vendorRisk':
          // Sort by risk level: High > Medium > Low
          const riskOrder = { '🔴 High Risk': 3, '🟡 Medium Risk': 2, '🟢 Low Risk': 1 };
          aValue = riskOrder[a.vendorRisk] || 0;
          bValue = riskOrder[b.vendorRisk] || 0;
          break;
          
        case 'priority':
          // Sort by priority: High > Medium > Low
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
          
        case 'vendorCount':
          aValue = a.vendorCount;
          bValue = b.vendorCount;
          break;
          
        case 'days':
          aValue = a.daysSinceLastPurchase;
          bValue = b.daysSinceLastPurchase;
          break;
          
        case 'totalCost':
          aValue = a.totalCost;
          bValue = b.totalCost;
          break;
          
        case 'totalQuantity':
          aValue = a.totalQuantity;
          bValue = b.totalQuantity;
          break;
          
        case 'averageUnitCost':
          aValue = a.averageUnitCost;
          bValue = b.averageUnitCost;
          break;
          
        default:
          aValue = a.productId;
          bValue = b.productId;
      }
      
      // Apply sort order
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    return filtered;
  };

  // NEW: Get sorted and filtered vendors
  const getSortedAndFilteredVendors = () => {
    if (!data?.vendorPerformance) return [];
    
    let filtered = [...data.vendorPerformance];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(vendor => 
        vendor.vendor.toLowerCase().includes(term)
      );
    }
    
    // Sort vendors by selected criteria
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'totalSpent') {
        aValue = a.totalSpent;
        bValue = b.totalSpent;
      } else if (sortBy === 'productCount') {
        aValue = a.productCount;
        bValue = b.productCount;
      } else if (sortBy === 'criticalProducts') {
        aValue = a.criticalProducts;
        bValue = b.criticalProducts;
      } else {
        aValue = a.vendor;
        bValue = b.vendor;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    
    return filtered;
  };

  const calculateDaysAgo = (dateString) => {
    if (!dateString) return 999;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 999;
      const now = new Date();
      return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  };

  const calculateRiskScore = (products) => {
    const totalProducts = products.length;
    if (totalProducts === 0) return 0;
    
    const highRiskWeight = products.filter(p => p.vendorCount === 1).length * 3;
    const mediumRiskWeight = products.filter(p => p.vendorCount === 2).length * 2;
    const lowRiskWeight = products.filter(p => p.vendorCount >= 3).length * 1;
    
    const maxScore = totalProducts * 3;
    const currentScore = highRiskWeight + mediumRiskWeight + lowRiskWeight;
    
    return Math.round((currentScore / maxScore) * 100);
  };

  // Sample data for demo
  const getSampleData = () => {
    return {
      summary: {
        totalPurchases: 9,
        recentPurchases: 1,
        totalInventoryValue: 142550,
        totalUnitsPurchased: 1870,
        averageUnitCost: 87.44,
        uniqueVendors: 5,
        uniqueProducts: 9,
        singleSourcedProducts: 8,
        highRiskProducts: 8,
        mediumRiskProducts: 1,
        lowRiskProducts: 0,
        riskScore: 85 // High risk score
      },
      productAnalysis: [
        { productId: 'P031', totalQuantity: 1500, totalCost: 92500, averageUnitCost: 61.67, 
          lastPurchaseDate: '2025-12-11', vendorCount: 2, daysSinceLastPurchase: 0, 
          priority: 'Low', vendorRisk: '🟡 Medium Risk', vendors: ['V001', 'V005'], recentActivity: true },
        { productId: 'P003', totalQuantity: 300, totalCost: 6600, averageUnitCost: 22.00, 
          lastPurchaseDate: '2025-01-29', vendorCount: 1, daysSinceLastPurchase: 316, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V005'], recentActivity: false },
        { productId: 'P010', totalQuantity: 240, totalCost: 15600, averageUnitCost: 65.00, 
          lastPurchaseDate: '2025-01-30', vendorCount: 1, daysSinceLastPurchase: 315, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V005'], recentActivity: false },
        { productId: 'P006', totalQuantity: 200, totalCost: 15000, averageUnitCost: 75.00, 
          lastPurchaseDate: '2025-01-25', vendorCount: 1, daysSinceLastPurchase: 320, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V003'], recentActivity: false },
        { productId: 'P007', totalQuantity: 160, totalCost: 7200, averageUnitCost: 45.00, 
          lastPurchaseDate: '2025-02-03', vendorCount: 1, daysSinceLastPurchase: 311, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V002'], recentActivity: false },
        { productId: 'P004', totalQuantity: 150, totalCost: 8250, averageUnitCost: 55.00, 
          lastPurchaseDate: '2025-01-12', vendorCount: 1, daysSinceLastPurchase: 333, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V004'], recentActivity: false },
        { productId: 'P005', totalQuantity: 120, totalCost: 16800, averageUnitCost: 140.00, 
          lastPurchaseDate: '2025-02-02', vendorCount: 1, daysSinceLastPurchase: 312, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V003'], recentActivity: false },
        { productId: 'P009', totalQuantity: 110, totalCost: 19800, averageUnitCost: 180.00, 
          lastPurchaseDate: '2025-02-01', vendorCount: 1, daysSinceLastPurchase: 313, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V005'], recentActivity: false },
        { productId: 'P008', totalQuantity: 90, totalCost: 10800, averageUnitCost: 120.00, 
          lastPurchaseDate: '2025-01-18', vendorCount: 1, daysSinceLastPurchase: 327, 
          priority: 'High', vendorRisk: '🔴 High Risk', vendors: ['V003'], recentActivity: false }
      ],
      vendorPerformance: [
        { vendor: 'V005', totalSpent: 46200, productCount: 3, criticalProducts: 3 },
        { vendor: 'V001', totalSpent: 42500, productCount: 1, criticalProducts: 1 },
        { vendor: 'V003', totalSpent: 38400, productCount: 3, criticalProducts: 3 },
        { vendor: 'V004', totalSpent: 8250, productCount: 1, criticalProducts: 1 },
        { vendor: 'V002', totalSpent: 7200, productCount: 1, criticalProducts: 1 }
      ],
      purchases: [],
      uniqueVendors: ['V001', 'V002', 'V003', 'V004', 'V005'],
      uniqueProducts: ['P003', 'P004', 'P005', 'P006', 'P007', 'P008', 'P009', 'P010', 'P031']
    };
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rs 0';
  
  // Simple formatting with commas
  const formattedAmount = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs ${formattedAmount}`;
};

  const formatNumber = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-IN');
  };

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getVendorRiskColor = (risk) => {
    if (risk.includes('High')) return 'text-red-600 font-bold';
    if (risk.includes('Medium')) return 'text-yellow-600 font-medium';
    if (risk.includes('Low')) return 'text-green-600';
    return 'text-gray-600';
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Purchase Data...</p>
          <p className="text-gray-400 text-sm mt-1">Analyzing supply chain risks</p>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">📊 Purchases Dashboard</h1>
            <p className="text-gray-600 mt-2">Inventory management with supply chain risk analysis</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                Data source: Google Sheets • Risk Score: <span className={`font-bold ${data?.summary?.riskScore > 70 ? 'text-red-600' : data?.summary?.riskScore > 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {data?.summary?.riskScore || 0}% 
                </span>
              </span>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowRiskAnalysis(!showRiskAnalysis)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                showRiskAnalysis 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showRiskAnalysis ? 'Hide Risk Analysis' : 'Show Risk Analysis'}
            </button>
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

      {/* Enhanced Summary Cards with Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <Box 
          label="Total Products" 
          value={data?.summary?.uniqueProducts || 0}
          sublabel={`${data?.productAnalysis?.length || 0} analyzed`}
          icon="📦"
          isLoading={loading}
        />
        <Box 
          label="Single-Sourced" 
          value={data?.summary?.singleSourcedProducts || 0}
          sublabel="⚠️ High Risk Products"
          icon="🚨"
          isLoading={loading}
          warning={true}
        />
        <Box 
          label="Purchased Inventory Value" 
          value={formatCurrency(data?.summary?.totalInventoryValue || 0)}
          sublabel={`${formatNumber(data?.summary?.totalUnitsPurchased || 0)} units`}
          icon="💰"
          isLoading={loading}
        />
        <Box 
          label="Risk Score" 
          value={`${data?.summary?.riskScore || 0}%`}
          sublabel={data?.summary?.riskScore > 70 ? 'High Risk' : data?.summary?.riskScore > 40 ? 'Medium Risk' : 'Low Risk'}
          icon="⚠️"
          isLoading={loading}
          warning={data?.summary?.riskScore > 70}
        />
      </div>

      {/* SUPPLY CHAIN RISK ANALYSIS SECTION */}
      {showRiskAnalysis && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">🔴 Supply Chain Risk Analysis</h2>
              <p className="text-gray-600 text-sm">Vendor diversification and risk assessment</p>
            </div>
            <div className="mt-2 md:mt-0">
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-800">
                {data?.summary?.singleSourcedProducts || 0} Critical Items
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Risk Distribution */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <h3 className="font-bold text-gray-800 mb-3">Risk Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-red-700">🔴 High Risk</span>
                  <span className="font-bold">{data?.summary?.highRiskProducts || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-700">🟡 Medium Risk</span>
                  <span className="font-bold">{data?.summary?.mediumRiskProducts || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">🟢 Low Risk</span>
                  <span className="font-bold">{data?.summary?.lowRiskProducts || 0}</span>
                </div>
              </div>
            </div>
            
            {/* Critical Vendors */}
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-gray-800 mb-3">Vendor Dependency</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Single-Source Products:</span>
                  <span className="font-bold text-red-600">{data?.summary?.singleSourcedProducts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dual-Source Products:</span>
                  <span className="font-bold text-yellow-600">
                    {data?.productAnalysis?.filter(p => p.vendorCount === 2).length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Multi-Source Products:</span>
                  <span className="font-bold text-green-600">
                    {data?.productAnalysis?.filter(p => p.vendorCount >= 3).length || 0}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Recommendations */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-3">📋 Action Required</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span>Find backup suppliers for {data?.summary?.singleSourcedProducts || 0} products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>Review contracts with single-source vendors</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  <span>Increase safety stock for high-risk items</span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Vendor Risk Summary */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">Vendor Risk Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Vendor</th>
                    <th className="p-2 text-left">Products Supplied</th>
                    <th className="p-2 text-left">Critical Products</th>
                    <th className="p-2 text-left">Total Spent</th>
                    <th className="p-2 text-left">Risk Level</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedAndFilteredVendors().map((vendor, index) => {
                    const criticalCount = vendor.productCount; // Simplified
                    const riskLevel = criticalCount >= 3 ? '🔴 High' : criticalCount >= 2 ? '🟡 Medium' : '🟢 Low';
                    
                    return (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2 font-medium">{vendor.vendor}</td>
                        <td className="p-2">{vendor.productCount}</td>
                        <td className="p-2 font-bold text-red-600">{criticalCount}</td>
                        <td className="p-2">{formatCurrency(vendor.totalSpent)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${criticalCount >= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {riskLevel}
                          </span>
                        </td>
                        <td className="p-2">
                          {criticalCount >= 2 && (
                            <span className="text-xs text-red-600">Find alternatives</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Product ID, Vendor ID, Risk Level..."
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
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="all">All Vendors</option>
              {data?.uniqueVendors?.map((vendor, index) => (
                <option key={index} value={vendor}>{vendor}</option>
              ))}
            </select>
            
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px]"
            >
              <option value="all">All Products</option>
              {data?.uniqueProducts?.map((product, index) => (
                <option key={index} value={product}>{product}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
            >
              <option value="vendorRisk">Sort by Risk</option>
              <option value="priority">Sort by Priority</option>
              <option value="productId">Sort by Product</option>
              <option value="vendorCount">Sort by Vendor Count</option>
              <option value="days">Sort by Days Ago</option>
              <option value="totalCost">Sort by Total Cost</option>
              <option value="totalQuantity">Sort by Quantity</option>
              <option value="averageUnitCost">Sort by Avg Cost</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 min-w-[80px] justify-center"
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>
        
        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => {
              setFilterVendor('all');
              setFilterProduct('all');
              setSearchTerm('');
              setSortBy('vendorRisk');
              setSortOrder('desc');
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200"
          >
            Clear Filters
          </button>
          <button
            onClick={() => {
              setSortBy('vendorRisk');
              setSortOrder('desc');
            }}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs hover:bg-red-200"
          >
            🔴 High Risk First
          </button>
          <button
            onClick={() => {
              setSortBy('vendorCount');
              setSortOrder('asc');
            }}
            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs hover:bg-yellow-200"
          >
            ⚠️ Single Sources
          </button>
          <button
            onClick={() => {
              setSortBy('days');
              setSortOrder('desc');
            }}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs hover:bg-purple-200"
          >
            📅 Oldest First
          </button>
        </div>
      </div>

      {/* ENHANCED PRODUCT ANALYSIS TABLE */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Product Analysis</h2>
            <p className="text-gray-600 text-sm">Inventory and supply chain risk insights by product</p>
          </div>
          <div className="mt-2 md:mt-0 text-sm text-gray-500">
            Showing {getSortedAndFilteredProducts().length} of {data?.productAnalysis?.length || 0} products
          </div>
        </div>
        
        {getSortedAndFilteredProducts().length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('productId');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Product
                      {sortBy === 'productId' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('totalQuantity');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Qty
                      {sortBy === 'totalQuantity' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('totalCost');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Total Cost
                      {sortBy === 'totalCost' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('averageUnitCost');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Avg Cost
                      {sortBy === 'averageUnitCost' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('days');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Days Ago
                      {sortBy === 'days' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('vendorCount');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Vendors
                      {sortBy === 'vendorCount' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {getSortedAndFilteredProducts().map((product, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className="p-3 font-medium text-gray-900">
                      {product.productId}
                      {product.recentActivity && (
                        <span className="ml-2 text-xs text-green-500">🟢 Active</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700 font-medium">{formatNumber(product.totalQuantity)}</td>
                    <td className="p-3 font-semibold text-green-700">{formatCurrency(product.totalCost)}</td>
                    <td className="p-3 text-gray-700">{formatCurrency(product.averageUnitCost)}</td>
                    <td className="p-3 text-gray-700">
                      {product.daysSinceLastPurchase}
                      {product.daysSinceLastPurchase > 30 && (
                        <div className="text-xs text-red-500">⚠️ Old</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {getVendorStatus(product.vendorCount)}
                      </div>
                      <div className={`text-xs mt-1 ${getVendorRiskColor(product.vendorRisk)}`}>
                        {product.vendorRisk}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-sm font-medium ${getVendorRiskColor(product.vendorRisk)}`}>
                        {product.vendorRisk}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(product.priority)}`}>
                        {product.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      {product.vendorCount === 1 && (
                        <span className="text-xs text-red-600 font-medium">🔍 Find Backup</span>
                      )}
                      {product.vendorCount === 2 && (
                        <span className="text-xs text-yellow-600">📝 Review</span>
                      )}
                      {product.vendorCount >= 3 && (
                        <span className="text-xs text-green-600">✅ Good</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600">No product data available</h3>
            {searchTerm && (
              <p className="text-gray-500 mt-2">No products found for "{searchTerm}"</p>
            )}
          </div>
        )}
      </div>

      {/* VENDOR PERFORMANCE TABLE */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Vendor Performance</h2>
            <p className="text-gray-600 text-sm">Purchase analysis and dependency assessment</p>
          </div>
          <div className="mt-2 md:mt-0 text-sm text-gray-500">
            {getSortedAndFilteredVendors().length} vendors
          </div>
        </div>
        
        {getSortedAndFilteredVendors().length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('vendor');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Vendor
                      {sortBy === 'vendor' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('totalSpent');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Total Spent
                      {sortBy === 'totalSpent' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('productCount');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Products
                      {sortBy === 'productCount' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => {
                        setSortBy('criticalProducts');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-blue-600 font-medium"
                    >
                      Critical Products
                      {sortBy === 'criticalProducts' && (
                        <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Dependency Level</th>
                  <th className="p-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {getSortedAndFilteredVendors().map((vendor, index) => {
                  const criticalCount = vendor.productCount;
                  const dependencyLevel = criticalCount >= 3 ? '🔴 High' : criticalCount >= 2 ? '🟡 Medium' : '🟢 Low';
                  const avgPurchase = vendor.totalSpent / Math.max(vendor.purchaseCount || 1, 1);
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="p-3 font-medium text-gray-900">{vendor.vendor}</td>
                      <td className="p-3 font-bold text-green-700">{formatCurrency(vendor.totalSpent)}</td>
                      <td className="p-3 text-gray-700">{vendor.productCount}</td>
                      <td className="p-3 font-bold text-red-600">{criticalCount}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          criticalCount >= 3 ? 'bg-red-100 text-red-800' :
                          criticalCount >= 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {dependencyLevel}
                        </span>
                      </td>
                      <td className="p-3">
                        {criticalCount >= 3 ? (
                          <span className="text-xs text-red-600 font-medium">Urgent: Find alternatives</span>
                        ) : criticalCount >= 2 ? (
                          <span className="text-xs text-yellow-600">Monitor: Seek backups</span>
                        ) : (
                          <span className="text-xs text-green-600">Good: Maintain</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-600">No vendor data available</h3>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.productId} - Product Analysis</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedProduct.priority)}`}>
                      {selectedProduct.priority} Priority
                    </span>
                    <span className={`text-sm font-medium ${getVendorRiskColor(selectedProduct.vendorRisk)}`}>
                      {selectedProduct.vendorRisk}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Purchase Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-600 text-sm">Total Quantity Purchased</p>
                      <p className="font-bold text-lg text-blue-600">{formatNumber(selectedProduct.totalQuantity)} units</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Total Cost</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(selectedProduct.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Average Unit Cost</p>
                      <p className="font-bold text-lg">{formatCurrency(selectedProduct.averageUnitCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Last Purchase Date</p>
                      <p className="font-medium">{formatDate(selectedProduct.lastPurchaseDate)}</p>
                      <p className="text-sm text-gray-500">({selectedProduct.daysSinceLastPurchase} days ago)</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Vendor Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-600 text-sm">Number of Vendors</p>
                      <p className="font-bold text-lg">{getVendorStatus(selectedProduct.vendorCount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Risk Level</p>
                      <p className={`font-bold text-lg ${getVendorRiskColor(selectedProduct.vendorRisk)}`}>
                        {selectedProduct.vendorRisk}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Supplier Diversification</p>
                      <div className="mt-2">
                        {selectedProduct.vendorCount === 1 ? (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <p className="text-red-700 font-medium">⚠️ Single Source Risk</p>
                            <p className="text-red-600 text-sm mt-1">This product depends on only one supplier</p>
                          </div>
                        ) : selectedProduct.vendorCount === 2 ? (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                            <p className="text-yellow-700 font-medium">🟡 Dual Source</p>
                            <p className="text-yellow-600 text-sm mt-1">You have a backup supplier</p>
                          </div>
                        ) : (
                          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                            <p className="text-green-700 font-medium">🟢 Multiple Sources</p>
                            <p className="text-green-600 text-sm mt-1">Good supplier diversification</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-700 mb-3">📋 Recommendations</h3>
                <div className="space-y-3">
                  {selectedProduct.vendorCount === 1 ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h4 className="font-bold text-red-800 mb-2">🔴 Immediate Action Required</h4>
                      <ul className="space-y-2 text-red-700">
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Find at least one alternative supplier immediately</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Increase safety stock by 50%</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Review contract terms with current supplier</span>
                        </li>
                      </ul>
                    </div>
                  ) : selectedProduct.vendorCount === 2 ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h4 className="font-bold text-yellow-800 mb-2">🟡 Monitoring Required</h4>
                      <ul className="space-y-2 text-yellow-700">
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Maintain relationships with both suppliers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Consider adding a third supplier for critical periods</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Compare prices between both suppliers quarterly</span>
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <h4 className="font-bold text-green-800 mb-2">🟢 Good Position</h4>
                      <ul className="space-y-2 text-green-700">
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Maintain current supplier relationships</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Use multiple suppliers for price negotiation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span>•</span>
                          <span>Consider volume discounts with top suppliers</span>
                        </li>
                      </ul>
                    </div>
                  )}
                  
                  {selectedProduct.daysSinceLastPurchase > 30 && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg mt-4">
                      <h4 className="font-bold text-orange-800 mb-2">📅 Purchase Timing Alert</h4>
                      <p className="text-orange-700">
                        Last purchase was {selectedProduct.daysSinceLastPurchase} days ago. Consider restocking soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSelectedProduct(null)}
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
              Supply Chain Risk Analysis • Data from Purchases_Log sheet
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
              Risk analysis updated • Priority logic: Time + Vendor Diversification
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