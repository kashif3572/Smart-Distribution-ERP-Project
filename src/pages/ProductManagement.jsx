// ProductManagement.jsx - COMPLETE VERSION WITH AUTO-FETCH
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AddProduct from "./AddProduct";

export default function ProductManagement() {
  const [activeSection, setActiveSection] = useState("viewProducts");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedVendor, setSelectedVendor] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [editingProduct, setEditingProduct] = useState(null);
  const [updatingPrice, setUpdatingPrice] = useState(null);
  const [updatingStock, setUpdatingStock] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const navigate = useNavigate();

  // Calculate totals
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + (parseFloat(p.Sale_Price) || 0) * (parseInt(p.Current_Stock_Qty) || 0), 0);
  const totalPurchaseCost = products.reduce((sum, p) => sum + (parseFloat(p.Cost_Price) || 0) * (parseInt(p.Current_Stock_Qty) || 0), 0);
  const lowStockItems = products.filter(p => p.isLowStock).length;
  const potentialProfit = totalStockValue - totalPurchaseCost;
  const profitMargin = totalPurchaseCost > 0 ? (potentialProfit / totalPurchaseCost * 100).toFixed(1) : 0;

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app';
      const response = await fetch(`${API_BASE}/api/read/Product_Inventory`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 1) {
        const headers = data.data[0];
        const rows = data.data.slice(1);
        
        const productList = rows.map(row => {
          const product = {};
          headers.forEach((header, index) => {
            const cleanHeader = header.trim().replace(/[^a-zA-Z0-9_]/g, '_');
            product[cleanHeader] = row[index] || '';
          });
          
          const cost = parseFloat(product.Cost_Price) || 0;
          const sale = parseFloat(product.Sale_Price) || 0;
          const stock = parseInt(product.Current_Stock_Qty) || 0;
          
          product.profit = sale - cost;
          product.margin = cost > 0 ? ((sale - cost) / cost * 100).toFixed(1) : 0;
          product.stock_value = sale * stock;
          product.cost_value = cost * stock;
          product.isLowStock = stock < 10;
          product.profit_value = product.stock_value - product.cost_value;
          
          return product;
        });
        
        setProducts(productList);
        setFilteredProducts(productList);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      alert("Error loading products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch on initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter and search
  const applyFilters = () => {
    let filtered = products;
    
    if (selectedCategory !== "All") {
      filtered = filtered.filter(product => product.Category === selectedCategory);
    }
    
    if (selectedVendor !== "All") {
      filtered = filtered.filter(product => product.Vendor_Name === selectedVendor);
    }
    
    if (selectedStatus === "LowStock") {
      filtered = filtered.filter(product => product.isLowStock);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        (product.Name && product.Name.toLowerCase().includes(term)) ||
        (product.Product_ID && product.Product_ID.toLowerCase().includes(term)) ||
        (product.Vendor_Name && product.Vendor_Name.toLowerCase().includes(term))
      );
    }
    
    setFilteredProducts(filtered);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    applyFilters();
  };

  // Get unique values for filters
  const categories = ["All", ...new Set(products.map(p => p.Category).filter(Boolean))];
  const vendors = ["All", ...new Set(products.map(p => p.Vendor_Name).filter(Boolean))];

  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    if (num >= 1000000) {
      return `Rs ${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `Rs ${(num / 1000).toFixed(1)}K`;
    }
    return `Rs ${num.toFixed(2)}`;
  };

  // Format stock with unit
  const formatStockWithUnit = (quantity, unit) => {
    const qty = parseInt(quantity || 0);
    return (
      <div className="flex items-baseline gap-1">
        <span className="font-bold text-lg text-gray-900">
          {qty.toLocaleString('en-PK')}
        </span>
        <span className="text-gray-500 text-sm ml-1">
          {unit || 'Unit'}
        </span>
      </div>
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSelectedVendor("All");
    setSelectedStatus("All");
  };

  // ================ EDIT PRODUCT ================
  const handleEditProduct = (product = null) => {
    if (product) {
      setEditingProduct(product);
    } else {
      setEditingProduct({ 
        isBulkEdit: true,
        Product_ID: '',
        Name: '',
        Vendor_ID: '',
        Vendor_Name: '',
        Cost_Price: '',
        Sale_Price: '',
        Current_Stock_Qty: '',
        Unit: 'Piece',
        Category: '',
        Status: 'Active'
      });
    }
    setActiveSection("editProduct");
  };

  // ================ UPDATE PRICE ================
  const handleUpdatePrice = (product = null) => {
    if (product) {
      setUpdatingPrice({
        Product_ID: product.Product_ID,
        Name: product.Name,
        Vendor_ID: product.Vendor_ID,
        Vendor_Name: product.Vendor_Name,
        Old_Cost_Price: product.Cost_Price,
        New_Cost_Price: product.Cost_Price,
        Old_Sale_Price: product.Sale_Price,
        New_Sale_Price: product.Sale_Price,
        Notes: ''
      });
    } else {
      setUpdatingPrice({ 
        isBulkUpdate: true,
        Product_ID: '',
        Name: '',
        Vendor_ID: '',
        Vendor_Name: '',
        Old_Cost_Price: '',
        New_Cost_Price: '',
        Old_Sale_Price: '',
        New_Sale_Price: '',
        Notes: ''
      });
    }
    setActiveSection("updatePrice");
  };

  // ================ UPDATE STOCK ================
  const handleUpdateStock = (product = null) => {
    if (product) {
      setUpdatingStock({
        Product_ID: product.Product_ID,
        Name: product.Name,
        Vendor_ID: product.Vendor_ID,
        Vendor_Name: product.Vendor_Name,
        Current_Stock_Qty: product.Current_Stock_Qty,
        Cost_Price: product.Cost_Price,
        Unit: product.Unit || 'Piece',
        newQuantity: product.Current_Stock_Qty,
        updateType: "increase",
        purchaseNotes: '',
        Notes: ''
      });
    } else {
      setUpdatingStock({ 
        isBulkUpdate: true,
        Product_ID: '',
        Name: '',
        Vendor_ID: '',
        Vendor_Name: '',
        Current_Stock_Qty: '',
        Cost_Price: '',
        Unit: 'Piece',
        newQuantity: '',
        updateType: "increase",
        purchaseNotes: '',
        Notes: ''
      });
    }
    setActiveSection("updateStock");
  };

  // Function to fetch product by ID (CASE INSENSITIVE)
  const fetchProductById = (productId) => {
    if (!productId) return null;
    
    // Convert input to uppercase for case-insensitive matching
    const searchId = productId.toUpperCase().trim();
    
    // First check for exact match
    const exactMatch = products.find(p => 
      p.Product_ID && p.Product_ID.toUpperCase() === searchId
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // If not found, return null (no fuzzy matching)
    return null;
  };

  // ================ FORM SUBMIT HANDLERS ================

  const submitEditProduct = async (formData) => {
    try {
      setLoading(true);
      
      const updateData = {
        Product_ID: formData.Product_ID,
        Name: formData.Name,
        Vendor_ID: formData.Vendor_ID,
        Vendor_Name: formData.Vendor_Name,
        Cost_Price: parseFloat(formData.Cost_Price),
        Sale_Price: parseFloat(formData.Sale_Price),
        Current_Stock_Qty: parseInt(formData.Current_Stock_Qty),
        Unit: formData.Unit,
        Category: formData.Category,
        Status: formData.Status || 'Active'
      };

      // Update Product_Inventory via n8n
      const response = await fetch("https://n8n.edutechpulse.online/webhook/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        alert("✅ Product updated successfully!");
        setEditingProduct(null);
        fetchProducts();
        setActiveSection("viewProducts");
      } else {
        throw new Error("Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error updating product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitPriceUpdate = async (formData) => {
    try {
      setLoading(true);
      
      if (!formData.Product_ID) {
        alert("Please enter a Product ID");
        return;
      }

      const priceData = {
        Product_ID: formData.Product_ID,
        Name: formData.Name,
        Old_Cost_Price: formData.Old_Cost_Price,
        New_Cost_Price: parseFloat(formData.New_Cost_Price),
        Old_Sale_Price: formData.Old_Sale_Price,
        New_Sale_Price: parseFloat(formData.New_Sale_Price),
        Vendor_ID: formData.Vendor_ID,
        Vendor_Name: formData.Vendor_Name,
        Updated_By: "Admin",
        Update_Date: new Date().toISOString().split('T')[0],
        Notes: formData.Notes || ""
      };

      // Update Product_Inventory
      const updateResponse = await fetch("https://n8n.edutechpulse.online/webhook/update-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(priceData)
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update price");
      }

      // Log price change for audit
      await fetch("https://n8n.edutechpulse.online/webhook/log-price-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...priceData,
          Type: "Price Update"
        })
      });

      alert("✅ Price updated successfully with audit log!");
      setUpdatingPrice(null);
      fetchProducts();
      setActiveSection("viewProducts");
      
    } catch (error) {
      console.error("Error updating price:", error);
      alert("Error updating price. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitStockUpdate = async (formData) => {
    try {
      setLoading(true);
      
      if (!formData.Product_ID) {
        alert("Please enter a Product ID");
        return;
      }

      const oldStock = parseInt(formData.Current_Stock_Qty) || 0;
      const newStock = parseInt(formData.newQuantity) || 0;
      const quantityChange = newStock - oldStock;
      
      if (quantityChange === 0) {
        alert("No change in stock quantity!");
        return;
      }

      const stockData = {
        Product_ID: formData.Product_ID,
        Product_Name: formData.Name,
        Vendor_ID: formData.Vendor_ID,
        Vendor_Name: formData.Vendor_Name,
        Old_Stock: oldStock,
        New_Stock: newStock,
        Quantity_Change: quantityChange,
        Unit: formData.Unit,
        Update_Type: formData.updateType, // "increase" (purchase) or "adjustment"
        Updated_By: "Admin",
        Update_Date: new Date().toISOString().split('T')[0],
        Notes: formData.Notes || ""
      };

      // 1. Update Product_Inventory stock
      const inventoryResponse = await fetch("https://n8n.edutechpulse.online/webhook/update-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockData)
      });

      if (!inventoryResponse.ok) {
        throw new Error("Failed to update inventory");
      }

      // 2. If stock increase (purchase), add to Purchases_Log
      if (formData.updateType === "increase" && quantityChange > 0) {
        const costPrice = parseFloat(formData.Cost_Price) || 0;
        const purchaseData = {
          Purchase_ID: `PUR-${Date.now()}`,
          Vendor_ID: formData.Vendor_ID,
          Product_ID: formData.Product_ID,
          Product_Name: formData.Name,
          Qty: quantityChange,
          Cost_Price: costPrice,
          Total_Cost: quantityChange * costPrice,
          Date: new Date().toISOString().split('T')[0],
          Notes: formData.purchaseNotes || "Stock purchase"
        };

        await fetch("https://n8n.edutechpulse.online/webhook/add-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(purchaseData)
        });

        // 3. Update Vendor_Products last purchase date and price
        await fetch("https://n8n.edutechpulse.online/webhook/update-vendor-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Vendor_ID: formData.Vendor_ID,
            Product_ID: formData.Product_ID,
            Purchase_Price: costPrice,
            Last_Purchase_Date: new Date().toISOString().split('T')[0]
          })
        });
      }

      // 4. Log stock change for audit
      await fetch("https://n8n.edutechpulse.online/webhook/log-stock-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...stockData,
          Cost_Price: formData.Cost_Price
        })
      });

      alert(`✅ Stock updated successfully! ${quantityChange > 0 ? 'Purchase logged.' : 'Adjustment recorded.'}`);
      setUpdatingStock(null);
      fetchProducts();
      setActiveSection("viewProducts");
      
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Error updating stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ================ DELETE PRODUCT ================
  const handleDeleteProduct = (product) => {
    setDeletingProduct(product);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${deletingProduct.Name}" (${deletingProduct.Product_ID})?\n\nThis will remove from inventory and all associated records!`
    );
    
    if (confirmDelete) {
      try {
        setLoading(true);
        
        // Delete product via n8n
        const response = await fetch("https://n8n.edutechpulse.online/webhook/delete-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Product_ID: deletingProduct.Product_ID,
            Product_Name: deletingProduct.Name,
            Deleted_By: "Admin",
            Delete_Date: new Date().toISOString().split('T')[0]
          })
        });

        if (response.ok) {
          alert(`✅ Product "${deletingProduct.Name}" deleted successfully!`);
          setDeletingProduct(null);
          fetchProducts();
        } else {
          throw new Error("Failed to delete product");
        }
        
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error deleting product. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Apply filters when filter states change
  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedVendor, selectedStatus]);

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-blue-600">📦</span>
              Product Management
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setActiveSection("addProduct")}
              className="px-4 py-3 sm:px-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>➕</span>
              <span>Add Product</span>
            </button>
            <button
              onClick={fetchProducts}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Total Products</p>
                <p className="text-xl font-bold text-gray-800 mt-1">{totalProducts}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Sales Value</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {formatCurrency(totalStockValue)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Purchase Cost</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  {formatCurrency(totalPurchaseCost)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">📊</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Profit</p>
                <p className="text-xl font-bold text-purple-600 mt-1">
                  {formatCurrency(potentialProfit)}
                </p>
                <p className="text-xs text-gray-500">{profitMargin}% margin</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600">📈</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium">Low Stock</p>
                <p className="text-xl font-bold text-red-600 mt-1">{lowStockItems}</p>
                <p className="text-xs text-gray-500">Below threshold</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - UPDATED BUTTON NAMES */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveSection("viewProducts")}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === "viewProducts" 
                ? "bg-blue-600 text-white" 
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>👁️</span>
            <span>View Products</span>
          </button>
          <button
            onClick={() => setActiveSection("addProduct")}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === "addProduct" 
                ? "bg-green-600 text-white" 
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>➕</span>
            <span>Add Product</span>
          </button>
          <button
            onClick={() => handleEditProduct()}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === "editProduct" 
                ? "bg-yellow-600 text-white" 
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>✏️</span>
            <span>Edit Products</span>
          </button>
          <button
            onClick={() => handleUpdatePrice()}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === "updatePrice" 
                ? "bg-purple-600 text-white" 
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>💰</span>
            <span>Update Prices</span>
          </button>
          <button
            onClick={() => handleUpdateStock()}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeSection === "updateStock" 
                ? "bg-orange-600 text-white" 
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>📦</span>
            <span>Update Stock</span>
          </button>
        </div>

        {/* VIEW PRODUCTS SECTION */}
        {activeSection === "viewProducts" && (
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
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={handleSearch}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="All">All Categories</option>
                    {categories.slice(1).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="All">All Vendors</option>
                    {vendors.slice(1).map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="LowStock">Low Stock</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading products...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No products found</h3>
                  <p className="text-gray-500 mb-4">Try changing your search or filter criteria</p>
                  <button
                    onClick={clearAllFilters}
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
                            Product Details
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pricing
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vendor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-blue-600 text-sm">📦</span>
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 text-sm">
                                    {product.Name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                      {product.Product_ID}
                                    </span>
                                    {product.Category && (
                                      <span className="text-xs text-blue-600">
                                        {product.Category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Sale:</span>
                                  <span className="font-semibold text-green-600 text-sm">
                                    {formatCurrency(product.Sale_Price)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Cost:</span>
                                  <span className="font-medium text-gray-700 text-sm">
                                    {formatCurrency(product.Cost_Price)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                  <span className="text-xs text-gray-500">Profit:</span>
                                  <span className="font-medium text-green-600 text-xs">
                                    {formatCurrency(product.profit)} ({product.margin}%)
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                {formatStockWithUnit(product.Current_Stock_Qty, product.Unit)}
                                <div className="mt-2 space-y-0.5">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Value:</span>
                                    <span>{formatCurrency(product.stock_value)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Cost:</span>
                                    <span>{formatCurrency(product.cost_value)}</span>
                                  </div>
                                </div>
                                {product.isLowStock && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                                      ⚠️ Low
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {product.Vendor_Name}
                                </div>
                                <div className="text-xs text-gray-500">{product.Vendor_ID}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-yellow-100"
                                >
                                  <span>✏️</span>
                                  <span>Edit Product</span>
                                </button>
                                <button
                                  onClick={() => handleUpdatePrice(product)}
                                  className="px-3 py-1 bg-purple-50 text-purple-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-purple-100"
                                >
                                  <span>💰</span>
                                  <span>Update Price</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStock(product)}
                                  className="px-3 py-1 bg-orange-50 text-orange-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-orange-100"
                                >
                                  <span>📦</span>
                                  <span>Update Stock</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product)}
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
                        Showing <span className="font-semibold">{filteredProducts.length}</span> of <span className="font-semibold">{totalProducts}</span> products
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Sales:</span>{" "}
                          <span className="font-semibold text-green-600">
                            {formatCurrency(totalStockValue)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Profit:</span>{" "}
                          <span className="font-semibold text-purple-600">
                            {formatCurrency(potentialProfit)}
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

        {/* ADD PRODUCT SECTION */}
        {activeSection === "addProduct" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Add New Product</h2>
                <p className="text-gray-600 text-sm mt-1">Add products to your inventory</p>
              </div>
              <button
                onClick={() => setActiveSection("viewProducts")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center gap-1"
              >
                <span>←</span>
                <span>Back to Products</span>
              </button>
            </div>
            
            <AddProduct onSuccess={() => {
              fetchProducts();
              setActiveSection("viewProducts");
            }} />
          </div>
        )}

        {/* EDIT PRODUCTS SECTION */}
        {activeSection === "editProduct" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {editingProduct?.Product_ID ? `Edit Product: ${editingProduct.Name}` : 'Edit Product Details'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">Modify product information</p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setActiveSection("viewProducts");
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center gap-1"
              >
                <span>←</span>
                <span>Back to Products</span>
              </button>
            </div>
            
            <EditProductForm 
              product={editingProduct}
              onSubmit={submitEditProduct}
              onCancel={() => {
                setEditingProduct(null);
                setActiveSection("viewProducts");
              }}
              fetchProductById={fetchProductById}
              products={products}
            />
          </div>
        )}

        {/* UPDATE PRICES SECTION */}
        {activeSection === "updatePrice" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {updatingPrice?.Product_ID ? `Update Price: ${updatingPrice.Name}` : 'Update Product Prices'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">Modify product pricing information</p>
              </div>
              <button
                onClick={() => {
                  setUpdatingPrice(null);
                  setActiveSection("viewProducts");
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center gap-1"
              >
                <span>←</span>
                <span>Back to Products</span>
              </button>
            </div>
            
            <UpdatePriceForm 
              product={updatingPrice}
              onSubmit={submitPriceUpdate}
              onCancel={() => {
                setUpdatingPrice(null);
                setActiveSection("viewProducts");
              }}
              fetchProductById={fetchProductById}
              products={products}
            />
          </div>
        )}

        {/* UPDATE STOCK SECTION */}
        {activeSection === "updateStock" && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {updatingStock?.Product_ID ? `Update Stock: ${updatingStock.Name}` : 'Update Product Stock'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">Manage inventory levels and purchases</p>
              </div>
              <button
                onClick={() => {
                  setUpdatingStock(null);
                  setActiveSection("viewProducts");
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm flex items-center gap-1"
              >
                <span>←</span>
                <span>Back to Products</span>
              </button>
            </div>
            
            <UpdateStockForm 
              product={updatingStock}
              onSubmit={submitStockUpdate}
              onCancel={() => {
                setUpdatingStock(null);
                setActiveSection("viewProducts");
              }}
              fetchProductById={fetchProductById}
              products={products}
            />
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <DeleteConfirmationModal
              product={deletingProduct}
              onConfirm={confirmDeleteProduct}
              onCancel={() => setDeletingProduct(null)}
              loading={loading}
            />
          </div>
        )}
      </div>
    </main>
  );
}

// ================ UPDATED COMPONENT FORMS WITH AUTO-FETCH ================

function EditProductForm({ product, onSubmit, onCancel, fetchProductById, products }) {
  const [formData, setFormData] = useState({
    Product_ID: product?.Product_ID || '',
    Name: product?.Name || '',
    Vendor_ID: product?.Vendor_ID || '',
    Vendor_Name: product?.Vendor_Name || '',
    Cost_Price: product?.Cost_Price || '',
    Sale_Price: product?.Sale_Price || '',
    Current_Stock_Qty: product?.Current_Stock_Qty || '',
    Unit: product?.Unit || 'Piece',
    Category: product?.Category || '',
    Status: product?.Status || 'Active'
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Auto-fetch product details when Product ID changes
  const handleProductIdChange = async (productId) => {
    const newId = productId.toUpperCase();
    setFormData(prev => ({ ...prev, Product_ID: newId }));
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set timeout to fetch after user stops typing (500ms)
    timeoutRef.current = setTimeout(async () => {
      if (newId.length >= 2) {
        setSearchLoading(true);
        const foundProduct = fetchProductById(newId);
        
        if (foundProduct) {
          // Auto-fill all fields with the found product data
          setFormData({
            Product_ID: foundProduct.Product_ID,
            Name: foundProduct.Name || '',
            Vendor_ID: foundProduct.Vendor_ID || '',
            Vendor_Name: foundProduct.Vendor_Name || '',
            Cost_Price: foundProduct.Cost_Price || '',
            Sale_Price: foundProduct.Sale_Price || '',
            Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
            Unit: foundProduct.Unit || 'Piece',
            Category: foundProduct.Category || '',
            Status: foundProduct.Status || 'Active'
          });
        }
        setSearchLoading(false);
      }
    }, 500); // 500ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Selection */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <label className="block text-sm font-medium text-yellow-800 mb-2">
          Product Selection
          <span className="text-xs text-gray-600 ml-2">
            (Enter Product ID to auto-fill details)
          </span>
        </label>
        
        <div className="relative">
          <div className="flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={formData.Product_ID}
                onChange={(e) => handleProductIdChange(e.target.value)}
                className="w-full p-2.5 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 uppercase"
                placeholder="Enter Product ID (e.g., P015)"
                required
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (formData.Product_ID.length >= 2) {
                  setSearchLoading(true);
                  const foundProduct = fetchProductById(formData.Product_ID);
                  if (foundProduct) {
                    setFormData({
                      Product_ID: foundProduct.Product_ID,
                      Name: foundProduct.Name || '',
                      Vendor_ID: foundProduct.Vendor_ID || '',
                      Vendor_Name: foundProduct.Vendor_Name || '',
                      Cost_Price: foundProduct.Cost_Price || '',
                      Sale_Price: foundProduct.Sale_Price || '',
                      Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
                      Unit: foundProduct.Unit || 'Piece',
                      Category: foundProduct.Category || '',
                      Status: foundProduct.Status || 'Active'
                    });
                  }
                  setSearchLoading(false);
                }
              }}
              className="ml-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Load</span>
            </button>
          </div>
          
          {/* Product Suggestions */}
          {formData.Product_ID.length >= 2 && !searchLoading && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Available Product IDs:</p>
              <div className="flex flex-wrap gap-1">
                {products
                  .filter(p => 
                    p.Product_ID && 
                    p.Product_ID.toUpperCase().includes(formData.Product_ID.toUpperCase())
                  )
                  .slice(0, 8)
                  .map(p => (
                    <button
                      type="button"
                      key={p.Product_ID}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, Product_ID: p.Product_ID }));
                        const foundProduct = fetchProductById(p.Product_ID);
                        if (foundProduct) {
                          setFormData({
                            Product_ID: foundProduct.Product_ID,
                            Name: foundProduct.Name || '',
                            Vendor_ID: foundProduct.Vendor_ID || '',
                            Vendor_Name: foundProduct.Vendor_Name || '',
                            Cost_Price: foundProduct.Cost_Price || '',
                            Sale_Price: foundProduct.Sale_Price || '',
                            Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
                            Unit: foundProduct.Unit || 'Piece',
                            Category: foundProduct.Category || '',
                            Status: foundProduct.Status || 'Active'
                          });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-yellow-50"
                    >
                      {p.Product_ID}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Product Info Display */}
        {formData.Name && (
          <div className="mt-3 p-3 bg-white rounded border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Product Loaded: <span className="text-green-600">{formData.Name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You can now edit the product details below
                </p>
              </div>
              <div className="text-green-600">
                ✓ Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input
            type="text"
            value={formData.Name}
            onChange={(e) => setFormData({...formData, Name: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Product name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            type="text"
            value={formData.Category}
            onChange={(e) => setFormData({...formData, Category: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Category"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
          <input
            type="text"
            value={formData.Vendor_ID}
            onChange={(e) => setFormData({...formData, Vendor_ID: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Vendor ID"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
          <input
            type="text"
            value={formData.Vendor_Name}
            onChange={(e) => setFormData({...formData, Vendor_Name: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Vendor name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.Cost_Price}
            onChange={(e) => setFormData({...formData, Cost_Price: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (Rs) *</label>
          <input
            type="number"
            step="0.01"
            value={formData.Sale_Price}
            onChange={(e) => setFormData({...formData, Sale_Price: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
          <input
            type="number"
            value={formData.Current_Stock_Qty}
            onChange={(e) => setFormData({...formData, Current_Stock_Qty: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
          <select
            value={formData.Unit}
            onChange={(e) => setFormData({...formData, Unit: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Piece">Piece</option>
            <option value="Bottle">Bottle</option>
            <option value="Pack">Pack</option>
            <option value="Box">Box</option>
            <option value="Kg">Kg</option>
            <option value="Liter">Liter</option>
            <option value="Meter">Meter</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.Status}
            onChange={(e) => setFormData({...formData, Status: e.target.value})}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-6 border-t">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200"
        >
          Update Product
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function UpdatePriceForm({ product, onSubmit, onCancel, fetchProductById, products }) {
  const [formData, setFormData] = useState({
    Product_ID: product?.Product_ID || '',
    Name: product?.Name || '',
    Vendor_ID: product?.Vendor_ID || '',
    Vendor_Name: product?.Vendor_Name || '',
    Old_Cost_Price: product?.Old_Cost_Price || product?.Cost_Price || '',
    New_Cost_Price: product?.New_Cost_Price || product?.Cost_Price || '',
    Old_Sale_Price: product?.Old_Sale_Price || product?.Sale_Price || '',
    New_Sale_Price: product?.New_Sale_Price || product?.Sale_Price || '',
    Notes: product?.Notes || ''
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Auto-fetch product details when Product ID changes
  const handleProductIdChange = async (productId) => {
    const newId = productId.toUpperCase();
    setFormData(prev => ({ ...prev, Product_ID: newId }));
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set timeout to fetch after user stops typing (500ms)
    timeoutRef.current = setTimeout(async () => {
      if (newId.length >= 2) {
        setSearchLoading(true);
        const foundProduct = fetchProductById(newId);
        
        if (foundProduct) {
          // Auto-fill all fields with the found product data
          setFormData({
            Product_ID: foundProduct.Product_ID,
            Name: foundProduct.Name || '',
            Vendor_ID: foundProduct.Vendor_ID || '',
            Vendor_Name: foundProduct.Vendor_Name || '',
            Old_Cost_Price: foundProduct.Cost_Price || '',
            New_Cost_Price: foundProduct.Cost_Price || '',
            Old_Sale_Price: foundProduct.Sale_Price || '',
            New_Sale_Price: foundProduct.Sale_Price || '',
            Notes: formData.Notes || ''
          });
        }
        setSearchLoading(false);
      }
    }, 500); // 500ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Selection */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <label className="block text-sm font-medium text-purple-800 mb-2">
          Product Selection
          <span className="text-xs text-gray-600 ml-2">
            (Enter Product ID to auto-fill details)
          </span>
        </label>
        
        <div className="relative">
          <div className="flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={formData.Product_ID}
                onChange={(e) => handleProductIdChange(e.target.value)}
                className="w-full p-2.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                placeholder="Enter Product ID (e.g., P015)"
                required
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (formData.Product_ID.length >= 2) {
                  setSearchLoading(true);
                  const foundProduct = fetchProductById(formData.Product_ID);
                  if (foundProduct) {
                    setFormData({
                      Product_ID: foundProduct.Product_ID,
                      Name: foundProduct.Name || '',
                      Vendor_ID: foundProduct.Vendor_ID || '',
                      Vendor_Name: foundProduct.Vendor_Name || '',
                      Old_Cost_Price: foundProduct.Cost_Price || '',
                      New_Cost_Price: foundProduct.Cost_Price || '',
                      Old_Sale_Price: foundProduct.Sale_Price || '',
                      New_Sale_Price: foundProduct.Sale_Price || '',
                      Notes: formData.Notes || ''
                    });
                  }
                  setSearchLoading(false);
                }
              }}
              className="ml-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Load</span>
            </button>
          </div>
          
          {/* Product Suggestions */}
          {formData.Product_ID.length >= 2 && !searchLoading && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Available Product IDs:</p>
              <div className="flex flex-wrap gap-1">
                {products
                  .filter(p => 
                    p.Product_ID && 
                    p.Product_ID.toUpperCase().includes(formData.Product_ID.toUpperCase())
                  )
                  .slice(0, 8)
                  .map(p => (
                    <button
                      type="button"
                      key={p.Product_ID}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, Product_ID: p.Product_ID }));
                        const foundProduct = fetchProductById(p.Product_ID);
                        if (foundProduct) {
                          setFormData({
                            Product_ID: foundProduct.Product_ID,
                            Name: foundProduct.Name || '',
                            Vendor_ID: foundProduct.Vendor_ID || '',
                            Vendor_Name: foundProduct.Vendor_Name || '',
                            Old_Cost_Price: foundProduct.Cost_Price || '',
                            New_Cost_Price: foundProduct.Cost_Price || '',
                            Old_Sale_Price: foundProduct.Sale_Price || '',
                            New_Sale_Price: foundProduct.Sale_Price || '',
                            Notes: formData.Notes || ''
                          });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-purple-50"
                    >
                      {p.Product_ID}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Product Info Display */}
        {formData.Name && (
          <div className="mt-3 p-3 bg-white rounded border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Product Loaded: <span className="text-green-600">{formData.Name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Vendor: {formData.Vendor_Name} ({formData.Vendor_ID})
                </p>
              </div>
              <div className="text-green-600">
                ✓ Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Price Display */}
      {(formData.Old_Cost_Price || formData.Old_Sale_Price) && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Prices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Current Cost Price</p>
              <p className="text-lg font-bold text-blue-600">Rs {formData.Old_Cost_Price}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Current Sale Price</p>
              <p className="text-lg font-bold text-green-600">Rs {formData.Old_Sale_Price}</p>
            </div>
          </div>
        </div>
      )}

      {/* New Price Input */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">New Prices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Cost Price (Rs) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.New_Cost_Price}
              onChange={(e) => setFormData({...formData, New_Cost_Price: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Sale Price (Rs) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.New_Sale_Price}
              onChange={(e) => setFormData({...formData, New_Sale_Price: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={formData.Notes}
          onChange={(e) => setFormData({...formData, Notes: e.target.value})}
          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="Reason for price change, market adjustment, etc."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200"
        >
          Update Price
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function UpdateStockForm({ product, onSubmit, onCancel, fetchProductById, products }) {
  const [formData, setFormData] = useState({
    Product_ID: product?.Product_ID || '',
    Name: product?.Name || '',
    Vendor_ID: product?.Vendor_ID || '',
    Vendor_Name: product?.Vendor_Name || '',
    Current_Stock_Qty: product?.Current_Stock_Qty || '',
    Cost_Price: product?.Cost_Price || '',
    Unit: product?.Unit || 'Piece',
    newQuantity: product?.newQuantity || product?.Current_Stock_Qty || '',
    updateType: product?.updateType || 'increase',
    purchaseNotes: product?.purchaseNotes || '',
    Notes: product?.Notes || ''
  });

  const [searchLoading, setSearchLoading] = useState(false);
  const timeoutRef = useRef(null);

  // Auto-fetch product details when Product ID changes
  const handleProductIdChange = async (productId) => {
    const newId = productId.toUpperCase();
    setFormData(prev => ({ ...prev, Product_ID: newId }));
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set timeout to fetch after user stops typing (500ms)
    timeoutRef.current = setTimeout(async () => {
      if (newId.length >= 2) {
        setSearchLoading(true);
        const foundProduct = fetchProductById(newId);
        
        if (foundProduct) {
          // Auto-fill all fields with the found product data
          setFormData({
            Product_ID: foundProduct.Product_ID,
            Name: foundProduct.Name || '',
            Vendor_ID: foundProduct.Vendor_ID || '',
            Vendor_Name: foundProduct.Vendor_Name || '',
            Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
            Cost_Price: foundProduct.Cost_Price || '',
            Unit: foundProduct.Unit || 'Piece',
            newQuantity: foundProduct.Current_Stock_Qty || '',
            updateType: formData.updateType || 'increase',
            purchaseNotes: formData.purchaseNotes || '',
            Notes: formData.Notes || ''
          });
        }
        setSearchLoading(false);
      }
    }, 500); // 500ms delay
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const quantityChange = parseInt(formData.newQuantity) - parseInt(formData.Current_Stock_Qty);
  const totalCost = quantityChange > 0 ? quantityChange * (parseFloat(formData.Cost_Price) || 0) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Selection */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <label className="block text-sm font-medium text-orange-800 mb-2">
          Product Selection
          <span className="text-xs text-gray-600 ml-2">
            (Enter Product ID to auto-fill details)
          </span>
        </label>
        
        <div className="relative">
          <div className="flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={formData.Product_ID}
                onChange={(e) => handleProductIdChange(e.target.value)}
                className="w-full p-2.5 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 uppercase"
                placeholder="Enter Product ID (e.g., P015)"
                required
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (formData.Product_ID.length >= 2) {
                  setSearchLoading(true);
                  const foundProduct = fetchProductById(formData.Product_ID);
                  if (foundProduct) {
                    setFormData({
                      Product_ID: foundProduct.Product_ID,
                      Name: foundProduct.Name || '',
                      Vendor_ID: foundProduct.Vendor_ID || '',
                      Vendor_Name: foundProduct.Vendor_Name || '',
                      Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
                      Cost_Price: foundProduct.Cost_Price || '',
                      Unit: foundProduct.Unit || 'Piece',
                      newQuantity: foundProduct.Current_Stock_Qty || '',
                      updateType: formData.updateType || 'increase',
                      purchaseNotes: formData.purchaseNotes || '',
                      Notes: formData.Notes || ''
                    });
                  }
                  setSearchLoading(false);
                }
              }}
              className="ml-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Load</span>
            </button>
          </div>
          
          {/* Product Suggestions */}
          {formData.Product_ID.length >= 2 && !searchLoading && (
            <div className="mt-2">
              <p className="text-xs text-gray-600 mb-1">Available Product IDs:</p>
              <div className="flex flex-wrap gap-1">
                {products
                  .filter(p => 
                    p.Product_ID && 
                    p.Product_ID.toUpperCase().includes(formData.Product_ID.toUpperCase())
                  )
                  .slice(0, 8)
                  .map(p => (
                    <button
                      type="button"
                      key={p.Product_ID}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, Product_ID: p.Product_ID }));
                        const foundProduct = fetchProductById(p.Product_ID);
                        if (foundProduct) {
                          setFormData({
                            Product_ID: foundProduct.Product_ID,
                            Name: foundProduct.Name || '',
                            Vendor_ID: foundProduct.Vendor_ID || '',
                            Vendor_Name: foundProduct.Vendor_Name || '',
                            Current_Stock_Qty: foundProduct.Current_Stock_Qty || '',
                            Cost_Price: foundProduct.Cost_Price || '',
                            Unit: foundProduct.Unit || 'Piece',
                            newQuantity: foundProduct.Current_Stock_Qty || '',
                            updateType: formData.updateType || 'increase',
                            purchaseNotes: formData.purchaseNotes || '',
                            Notes: formData.Notes || ''
                          });
                        }
                      }}
                      className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-orange-50"
                    >
                      {p.Product_ID}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Product Info Display */}
        {formData.Name && (
          <div className="mt-3 p-3 bg-white rounded border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Product Loaded: <span className="text-green-600">{formData.Name}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Current Stock: {formData.Current_Stock_Qty} {formData.Unit} | 
                  Cost: Rs {formData.Cost_Price}
                </p>
              </div>
              <div className="text-green-600">
                ✓ Ready
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Stock Display */}
      {formData.Current_Stock_Qty && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Current Stock Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Current Stock</p>
              <p className="text-lg font-bold text-blue-600">{formData.Current_Stock_Qty} {formData.Unit}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Cost Price</p>
              <p className="text-lg font-bold text-blue-600">Rs {formData.Cost_Price}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Stock Value</p>
              <p className="text-lg font-bold text-green-600">
                Rs {(parseInt(formData.Current_Stock_Qty) * (parseFloat(formData.Cost_Price) || 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Stock Update</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Stock Quantity *</label>
            <input
              type="number"
              value={formData.newQuantity}
              onChange={(e) => setFormData({...formData, newQuantity: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            {!isNaN(quantityChange) && (
              <p className={`text-sm mt-2 ${quantityChange > 0 ? 'text-green-600' : quantityChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                <span className="font-medium">Change:</span> {quantityChange > 0 ? '+' : ''}{quantityChange} {formData.Unit}
                {formData.updateType === 'increase' && quantityChange > 0 && (
                  <span className="ml-2">(Cost: Rs {totalCost.toFixed(2)})</span>
                )}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Type *</label>
            <select
              value={formData.updateType}
              onChange={(e) => setFormData({...formData, updateType: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="increase">Stock Purchase (Add to Purchases_Log)</option>
              <option value="adjustment">Stock Adjustment (Correction Only)</option>
              <option value="decrease">Stock Reduction (Sales/Usage)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.updateType === 'increase' 
                ? 'Creates purchase record and updates vendor data'
                : formData.updateType === 'adjustment'
                ? 'Only adjusts inventory quantity for corrections'
                : 'Reduces stock for sales or usage'}
            </p>
          </div>
        </div>
      </div>

      {/* Purchase Details (if purchase type) */}
      {formData.updateType === 'increase' && quantityChange > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800 mb-3">Purchase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Quantity Added</p>
              <p className="text-lg font-bold text-green-600">+{quantityChange} {formData.Unit}</p>
            </div>
            <div className="p-3 bg-white rounded border">
              <p className="text-xs text-gray-500">Total Purchase Cost</p>
              <p className="text-lg font-bold text-blue-600">Rs {totalCost.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Notes (Optional)</label>
            <input
              type="text"
              value={formData.purchaseNotes}
              onChange={(e) => setFormData({...formData, purchaseNotes: e.target.value})}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Purchase order number, delivery details, etc."
            />
          </div>
        </div>
      )}

      {/* General Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={formData.Notes}
          onChange={(e) => setFormData({...formData, Notes: e.target.value})}
          className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows="3"
          placeholder="Reason for stock change, quality check notes, etc."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t">
        <button
          type="submit"
          className="flex-1 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium shadow hover:shadow-md transition-all duration-200"
        >
          {formData.updateType === 'increase' ? 'Update Stock & Log Purchase' : 
           formData.updateType === 'decrease' ? 'Update Stock & Record Reduction' : 
           'Update Stock Adjustment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeleteConfirmationModal({ product, onConfirm, onCancel, loading }) {
  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
      <div className="p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">🗑️</span>
          </div>
        </div>
        
        <h2 className="text-lg font-bold text-gray-800 text-center mb-2">
          Delete Product
        </h2>
        
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to delete <span className="font-semibold">"{product.Name}"</span> (ID: {product.Product_ID})?
        </p>
        
        <div className="space-y-3">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-medium">⚠️ This action cannot be undone!</p>
            <p className="text-xs text-red-600 mt-1">
              • Product will be removed from inventory<br/>
              • All associated data will be deleted<br/>
              • No automatic backup available
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 font-medium"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}