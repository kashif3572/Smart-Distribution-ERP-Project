import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingOrder, setFetchingOrder] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  // Form state
  const [formData, setFormData] = useState({
    shop_id: "",
    order_id: "",
    cash_received: "",
    status: "Delivered",
  });
  
  // Order details from API
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderProducts, setOrderProducts] = useState([]);
  
  // Return items state
  const [returnItems, setReturnItems] = useState([]);
  const [currentReturnItem, setCurrentReturnItem] = useState({
    product_id: "",
    qty: "",
    reason: "",
    action: "Restock"
  });
  const [hasReturnItems, setHasReturnItems] = useState(false);

  // Clear message when user starts typing
  useEffect(() => {
    if (message.text && message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage({ text: "", type: "" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Redirect if user is not logged in or not a rider
  useEffect(() => {
    if (!user || user.role !== 'rider') {
      navigate('/login');
    } else {
      fetchDeliveryHistory();
    }
  }, [user, navigate]);

  // Fetch delivery history
  const fetchDeliveryHistory = async () => {
    try {
      setLoading(true);
      setMessage({ text: "", type: "" }); // Clear previous messages
      
      const response = await fetch(`https://n8n.edutechpulse.online/webhook/Dilivery-History?riderId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if we got valid data
        if (data && Array.isArray(data.deliveries)) {
          if (data.deliveries.length === 0) {
            // No history found - this is NOT an error, just no data
            setDeliveries([]);
            // DO NOT set a message here - let the UI show the friendly "No history" state
          } else {
            // We have deliveries
            setDeliveries(data.deliveries);
            // Optional: show success message only briefly
            setMessage({ 
              text: `Loaded ${data.deliveries.length} delivery records`, 
              type: "success" 
            });
            setTimeout(() => {
              if (message.text.includes("Loaded") && message.type === 'success') {
                setMessage({ text: "", type: "" });
              }
            }, 3000);
          }
        } else if (data && data.message && data.message.includes("No records")) {
          // Server returned "No records found" - this is NOT an error
          setDeliveries([]);
          // DO NOT set a message
        } else {
          // Invalid response format - this IS an error
          setDeliveries([]);
          setMessage({ 
            text: "Could not load delivery history. Please try again.", 
            type: "error" 
          });
        }
      } else {
        // Server error but not network error
        const errorText = await response.text();
        
        if (response.status === 404) {
          // 404 means no records found (not an error for empty history)
          setDeliveries([]);
          // DO NOT set a message - empty state is fine
        } else {
          // Actual server error (500, 400, etc.)
          setMessage({ 
            text: "Could not load delivery history. Please try again later.", 
            type: "error" 
          });
        }
      }
    } catch (error) {
      console.error("Error fetching delivery history:", error);
      // Only show error if it's a real network issue (not a 404/no records)
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        setMessage({ 
          text: "Network error. Please check your internet connection.", 
          type: "error" 
        });
      } else {
        // Other errors - show message
        setMessage({ 
          text: "Could not load delivery history", 
          type: "error" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch order details when order_id changes
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (formData.order_id && formData.order_id.length > 5) {
        try {
          setFetchingOrder(true);
          
          // Clear any delivery success messages when searching
          if (message.type === 'success' && message.text.includes("Delivery status updated")) {
            setMessage({ text: "Fetching order details...", type: "info" });
          } else {
            setMessage({ text: "Fetching order details...", type: "info" });
          }
          
          // Fetch from your n8n webhook
          const response = await fetch(
            `https://n8n.edutechpulse.online/webhook/Order-Details?orderId=${formData.order_id}`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Handle array response
            const orderData = Array.isArray(data) ? data[0] : data;
            
            if (orderData && orderData.order) {
              setOrderDetails(orderData.order);
              setOrderProducts(orderData.products || []);
              
              // Auto-populate form fields
              setFormData(prev => ({
                ...prev,
                shop_id: orderData.order.shop_id || "",
                cash_received: orderData.order.total_amount || ""
              }));
              
              setMessage({ 
                text: `Order found with ${orderData.products.length} products!`, 
                type: "success" 
              });
            } else {
              throw new Error("Invalid order data");
            }
          } else {
            throw new Error("Order not found");
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
          setOrderDetails(null);
          setOrderProducts([]);
          setMessage({ 
            text: "Order not found. Please check Order ID.", 
            type: "error" 
          });
        } finally {
          setFetchingOrder(false);
        }
      } else {
        setOrderDetails(null);
        setOrderProducts([]);
      }
    };

    // Add debounce to prevent too many API calls
    const timer = setTimeout(() => {
      fetchOrderDetails();
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.order_id]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear success messages when user starts editing
    if (message.type === 'success' && name === 'order_id') {
      setMessage({ text: "", type: "" });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Auto-fill return items from order products
  const autoFillReturnItems = () => {
    if (orderProducts.length > 0) {
      // Pre-populate return items with order products (empty quantities for rider to fill)
      const autoItems = orderProducts.map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        qty: "", // Empty for rider to fill
        max_qty: product.quantity, // Store original order quantity for validation
        reason: "",
        action: "Restock"
      }));
      setReturnItems(autoItems);
      setHasReturnItems(true);
      setMessage({ 
        text: `Return items pre-filled with ${orderProducts.length} products`, 
        type: "success" 
      });
    }
  };

  // Add custom return item
  const addReturnItem = () => {
    if (!currentReturnItem.product_id || !currentReturnItem.qty || !currentReturnItem.reason) {
      setMessage({ text: "Please fill all return item fields", type: "error" });
      return;
    }

    setReturnItems([...returnItems, { ...currentReturnItem }]);
    setCurrentReturnItem({
      product_id: "",
      qty: "",
      reason: "",
      action: "Restock"
    });
    
    setMessage({ text: "Return item added", type: "success" });
  };

  // Remove return item
  const removeReturnItem = (index) => {
    const newItems = [...returnItems];
    newItems.splice(index, 1);
    setReturnItems(newItems);
  };

  // Submit delivery update
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.shop_id || !formData.order_id || !formData.status) {
      setMessage({ text: "Please fill all required fields", type: "error" });
      return;
    }

    if (hasReturnItems && returnItems.length === 0) {
      setMessage({ text: "Please add return items or uncheck 'Has Return Items'", type: "error" });
      return;
    }

    // Filter out items with empty quantities
    const validReturnItems = hasReturnItems 
      ? returnItems.filter(item => item.qty && item.qty > 0 && item.reason)
      : [];

    const deliveryData = {
      shop_id: formData.shop_id,
      order_id: formData.order_id,
      cash_received: parseFloat(formData.cash_received) || 0,
      status: formData.status,
      return_items: validReturnItems,
      rider_id: user?.id || "RDR-001",
      rider_name: user?.name || ""
    };

    try {
      setMessage({ text: "Updating delivery status...", type: "info" });
      
      // Send to your webhook
      const response = await fetch("https://n8n.edutechpulse.online/webhook/Dilivery-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deliveryData),
      });

      if (response.ok) {
        // Add to local history
        const newDelivery = {
          id: Date.now(),
          ...deliveryData,
          timestamp: new Date().toLocaleString(),
          display_time: new Date().toLocaleTimeString('en-IN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };
        setDeliveries([newDelivery, ...deliveries]);
        
        // Show success message
        setMessage({ 
          text: "Delivery status updated successfully!", 
          type: "success" 
        });
        
        // Reset form
        resetForm();
        
        // Refresh history
        setTimeout(fetchDeliveryHistory, 1000);
      } else {
        throw new Error("Failed to update delivery");
      }
    } catch (error) {
      console.error("Error updating delivery:", error);
      setMessage({ 
        text: "Failed to update delivery status. Please try again.", 
        type: "error" 
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      shop_id: "",
      order_id: "",
      cash_received: "",
      status: "Delivered",
    });
    setOrderDetails(null);
    setOrderProducts([]);
    setReturnItems([]);
    setCurrentReturnItem({
      product_id: "",
      qty: "",
      reason: "",
      action: "Restock"
    });
    setHasReturnItems(false);
  };

  // Handle logout
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

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-orange-600 text-white p-3 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">🚚 Rider Delivery Panel</h1>
                <p className="text-gray-600 text-sm">
                  Welcome, <span className="font-semibold text-blue-600">{user?.name}</span> ({user?.id})
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDeliveryHistory}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-3 border-b">Update Delivery Status</h2>
              
              {/* Message Display - Show only errors and successes, NOT info messages about empty history */}
              {message.text && (message.type === 'error' || message.type === 'success' || message.type === 'warning') && (
                <div className={`p-4 rounded-lg mb-6 relative ${
                  message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                  message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                  'bg-yellow-50 border border-yellow-200 text-yellow-700'
                }`}>
                  <button
                    onClick={() => setMessage({ text: "", type: "" })}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                  <div className="flex items-start pr-6">
                    <div className="flex-shrink-0 mr-3">
                      {message.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : message.type === 'error' ? (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{message.text}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rider Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Rider Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Rider ID</label>
                    <input
                      type="text"
                      value={user.id}
                      readOnly
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Rider Name</label>
                    <input
                      type="text"
                      value={user.name}
                      readOnly
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                    />
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Order Search Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Order Information</h3>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Enter Order ID <span className="text-red-500">*</span>
                      {fetchingOrder && <span className="ml-2 text-blue-600 text-sm">(Searching...)</span>}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        name="order_id"
                        value={formData.order_id}
                        onChange={handleInputChange}
                        placeholder="Enter Order ID (e.g., ORD-1764950314067)"
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        required
                      />
                      {orderDetails && (
                        <button
                          type="button"
                          onClick={autoFillReturnItems}
                          className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                        >
                          Auto-fill Items
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Auto-filled Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Shop ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="shop_id"
                        value={formData.shop_id}
                        onChange={handleInputChange}
                        placeholder="Auto-filled from order"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-50"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Cash Received (₹)
                      </label>
                      <input
                        type="number"
                        name="cash_received"
                        value={formData.cash_received}
                        onChange={handleInputChange}
                        placeholder="Auto-filled from order total"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gray-50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        required
                      >
                        <option value="Delivered">✅ Delivered</option>
                        <option value="Partial Return">⚠️ Partial Return</option>
                        <option value="Fully Returned">❌ Fully Returned</option>
                        <option value="Failed">🚫 Failed</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Delivery Date
                      </label>
                      <input
                        type="text"
                        value={new Date().toLocaleDateString('en-IN')}
                        readOnly
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                      />
                    </div>
                  </div>
                  
                  {/* Order Preview */}
                  {orderDetails && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-green-800">✅ Order Found</h4>
                        <span className="text-sm text-gray-600">{orderDetails.date}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500">Order Total</div>
                          <div className="text-lg font-bold text-green-700">{formatCurrency(orderDetails.total_amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Products</div>
                          <div className="font-medium">{orderProducts.length} items</div>
                        </div>
                      </div>
                      
                      {orderProducts.length > 0 && (
                        <div className="text-sm">
                          <div className="text-gray-600 mb-2">Products in order:</div>
                          <div className="space-y-2">
                            {orderProducts.slice(0, 3).map((product, index) => (
                              <div key={index} className="flex justify-between bg-white p-2 rounded border">
                                <span className="font-medium">{product.product_id}</span>
                                <span className="text-gray-600">{product.product_name}</span>
                                <span className="font-bold">Qty: {product.quantity}</span>
                              </div>
                            ))}
                            {orderProducts.length > 3 && (
                              <div className="text-center text-gray-500 text-sm">
                                + {orderProducts.length - 3} more products
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Return Items Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Return Items (Optional)</h3>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="hasReturnItems"
                        checked={hasReturnItems}
                        onChange={(e) => setHasReturnItems(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="hasReturnItems" className="text-sm font-medium text-gray-600">
                        Has Return Items
                      </label>
                    </div>
                  </div>
                  
                  {hasReturnItems && (
                    <>
                      {/* Pre-filled Return Items */}
                      {returnItems.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-700 mb-3">Return Items ({returnItems.length})</h4>
                          <div className="space-y-4">
                            {returnItems.map((item, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="flex flex-col md:flex-row md:items-center justify-between">
                                  <div className="flex-1 mb-4 md:mb-0">
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                      <div>
                                        <div className="text-xs text-gray-500">Product</div>
                                        <div className="font-medium">
                                          {item.product_id} - {item.product_name}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                          Ordered: {item.max_qty}
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Return Qty</div>
                                        <input
                                          type="number"
                                          min="0"
                                          max={item.max_qty}
                                          value={item.qty}
                                          onChange={(e) => {
                                            const newItems = [...returnItems];
                                            const value = parseInt(e.target.value) || 0;
                                            if (value <= item.max_qty) {
                                              newItems[index].qty = value;
                                              setReturnItems(newItems);
                                            } else {
                                              setMessage({ 
                                                text: `Cannot return more than ${item.max_qty} for ${item.product_id}`, 
                                                type: "error" 
                                              });
                                            }
                                          }}
                                          placeholder="0"
                                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      </div>
                                      
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Reason</div>
                                        <select
                                          value={item.reason}
                                          onChange={(e) => {
                                            const newItems = [...returnItems];
                                            newItems[index].reason = e.target.value;
                                            setReturnItems(newItems);
                                          }}
                                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="">Select Reason</option>
                                          <option value="Expired">Expired</option>
                                          <option value="Damaged">Damaged</option>
                                          <option value="Wrong Item">Wrong Item</option>
                                          <option value="Shop Rejected">Shop Rejected</option>
                                          <option value="Overstock">Overstock</option>
                                        </select>
                                      </div>
                                      
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Action</div>
                                        <select
                                          value={item.action}
                                          onChange={(e) => {
                                            const newItems = [...returnItems];
                                            newItems[index].action = e.target.value;
                                            setReturnItems(newItems);
                                          }}
                                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="Restock">Restock</option>
                                          <option value="Dispose">Dispose</option>
                                          <option value="Return to Vendor">Return to Vendor</option>
                                          <option value="Investigate">Investigate</option>
                                        </select>
                                      </div>
                                      
                                      <div className="flex items-end justify-end">
                                        <button
                                          type="button"
                                          onClick={() => removeReturnItem(index)}
                                          className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                                          title="Remove item"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Custom Return Item */}
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-3">Add Additional Return Item</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Product ID</label>
                            <input
                              type="text"
                              value={currentReturnItem.product_id}
                              onChange={(e) => setCurrentReturnItem(prev => ({
                                ...prev,
                                product_id: e.target.value
                              }))}
                              placeholder="e.g., P012"
                              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={currentReturnItem.qty}
                              onChange={(e) => setCurrentReturnItem(prev => ({
                                ...prev,
                                qty: e.target.value
                              }))}
                              placeholder="e.g., 5"
                              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Reason</label>
                            <select
                              value={currentReturnItem.reason}
                              onChange={(e) => setCurrentReturnItem(prev => ({
                                ...prev,
                                reason: e.target.value
                              }))}
                              className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="">Select Reason</option>
                              <option value="Expired">Expired</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Wrong Item">Wrong Item</option>
                              <option value="Shop Rejected">Shop Rejected</option>
                            </select>
                          </div>
                          
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={addReturnItem}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Item
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={message.type === 'info'}
                    className={`flex-1 font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md ${
                      message.type === 'info' 
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                    }`}
                  >
                    {message.type === 'info' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : (
                      'Update Delivery Status'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Delivery History */}
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Delivery History</h3>
                <span className="text-sm text-gray-500">
                  {loading ? "Loading..." : `${deliveries.length} records`}
                </span>
              </div>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
                  ))}
                </div>
              ) : deliveries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No delivery history yet</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Your completed deliveries will appear here
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Tip:</span> Update delivery status to start building your history
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {deliveries.slice(0, 10).map((delivery) => (
                    <div key={delivery.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-800">{delivery.order_id}</div>
                          <div className="text-sm text-gray-600">Shop: {delivery.shop_id}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          delivery.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'Partial Return' ? 'bg-yellow-100 text-yellow-800' :
                          delivery.status === 'Fully Returned' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {delivery.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <div className="text-xs text-gray-500">Cash Received</div>
                          <div className="font-bold text-green-600">{formatCurrency(delivery.cash_received)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Time</div>
                          <div className="text-sm">{delivery.display_time || delivery.timestamp}</div>
                        </div>
                      </div>
                      
                      {delivery.return_items && delivery.return_items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-1">Return Items: {delivery.return_items.length}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {deliveries.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(10, deliveries.length)} of {deliveries.length} recent deliveries
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 bg-white border-t">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-600 text-white p-2 rounded-lg">
                  🚚
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Rider Delivery System</p>
                  <p className="text-gray-500 text-sm">Smart Distribution</p>
                </div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-600 text-sm">
                Rider: <span className="font-semibold">{user?.name}</span> ({user?.id})
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}