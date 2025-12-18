import React, { useState, useEffect } from "react";

export default function AddProduct() {
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [unit, setUnit] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingId, setLoadingId] = useState(true);
  const [idError, setIdError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendorError, setVendorError] = useState(null);
  const [showNewVendor, setShowNewVendor] = useState(false);
  const [newVendorId, setNewVendorId] = useState("");
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorCategory, setNewVendorCategory] = useState("");
  const [newVendorCity, setNewVendorCity] = useState("");
  const [newVendorContact, setNewVendorContact] = useState("");
  const [manuallyEntered, setManuallyEntered] = useState(false);

  // Fetch live vendor data from API
  const fetchVendors = async () => {
    try {
      setLoadingVendors(true);
      setVendorError(null);
      const response = await fetch(
        "https://sheets-api-545260361851.us-central1.run.app/api/read/Vendors_DB"
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 1) {
        // Convert sheet data to vendor objects
        const headers = data.data[0];
        const rows = data.data.slice(1);
        
        const vendorList = rows.map(row => ({
          id: row[0] || "",
          name: row[1] || "",
          contact: row[2] || "",
          category: row[3] || "",
          city: row[4] || "",
          paymentTerms: row[5] || "",
          status: row[6] || ""
        }));
        
        setVendors(vendorList);
      } else {
        throw new Error("No vendor data found");
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setVendorError("Could not load vendors. Using default list.");
      // Fallback to static data
      setVendors([
        { id: "V001", name: "Coca Cola Beverages Ltd", category: "Soft Drinks / Juices" },
        { id: "V002", name: "PepsiCo Foods", category: "Snacks / Chips" },
        { id: "V003", name: "Nestlé Pakistan", category: "Dairy / Cereals / Baby Food" },
        { id: "V004", name: "National Foods Pvt Ltd", category: "Grocery / Spices / Cooking Items" },
        { id: "V005", name: "Unilever Pakistan", category: "Home & Personal Care" },
      ]);
    } finally {
      setLoadingVendors(false);
    }
  };

  // Fetch product ID from n8n (optional)
 const loadProductId = async () => {
  if (manuallyEntered && productId) return; // Don't override if manually entered

  setLoadingId(true);
  setIdError(null);
  try {
    // Fetch data from your Product_Inventory sheet via the Sheep API
    const API_BASE = import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app';
    const res = await fetch(`${API_BASE}/api/read/Product_Inventory`);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch sheet data: HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.success && data.data && Array.isArray(data.data)) {
      // Assuming column A (index 0) contains Product_ID
      const existingProductIds = data.data.slice(1) // Skip header row
        .map(row => row[0]) // Get first column (Product_ID)
        .filter(Boolean) // Remove empty values
        .filter(id => typeof id === 'string' && id.toString().match(/^P\d+/i)); // Filter valid PXXX IDs
      
      // Find the highest numeric part from existing PXXX IDs
      let maxNum = 0;
      existingProductIds.forEach(id => {
        const match = id.toString().match(/P(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      });
      
      // Generate next ID (P001, P002, etc.)
      const nextNum = maxNum + 1;
      const newProductId = `P${nextNum.toString().padStart(3, '0')}`;
      
      setProductId(newProductId);
      console.log(`Generated Product ID: ${newProductId} from ${existingProductIds.length} existing products`);
    } else {
      // If sheet is empty or no data, start with P001
      setProductId('P001');
    }
  } catch (err) {
    console.error("Error fetching product IDs:", err);
    setIdError("Could not fetch from Product_Inventory sheet. Please enter ID manually.");
    // Optionally, you could set a default ID here
    // setProductId('P001');
  } finally {
    setLoadingId(false);
  }
};

  // Initial data loading
  useEffect(() => {
    fetchVendors();
    loadProductId();
  }, []);

  // Auto-fill vendor ID when vendor name is selected
  useEffect(() => {
    if (vendorName && !showNewVendor) {
      const vendor = vendors.find(v => v.name === vendorName);
      if (vendor) {
        setVendorId(vendor.id);
      }
    }
  }, [vendorName, vendors, showNewVendor]);

  // Handle new vendor toggle
  const handleToggleNewVendor = () => {
    const wasNewVendor = showNewVendor;
    setShowNewVendor(!showNewVendor);
    
    if (!wasNewVendor && showNewVendor) {
      // Switching to new vendor mode - reset existing vendor fields
      setVendorName("");
      setVendorId("");
      // Auto-generate new vendor ID
      setNewVendorId(generateNextVendorId());
    } else if (wasNewVendor && !showNewVendor) {
      // Switching back to existing vendor mode - reset new vendor fields
      setNewVendorId("");
      setNewVendorName("");
      setNewVendorCategory("");
      setNewVendorCity("");
      setNewVendorContact("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");

    // Determine final vendor details
    const finalVendorId = showNewVendor ? newVendorId : vendorId;
    const finalVendorName = showNewVendor ? newVendorName : vendorName;

    // Validation
    if (!productId || !productName || !finalVendorId || !finalVendorName || 
        !costPrice || !salePrice || !stockQty || !unit) {
      alert("All fields are required!");
      setSubmitting(false);
      return;
    }

    if (parseFloat(salePrice) <= parseFloat(costPrice)) {
      alert("Sale price must be greater than cost price!");
      setSubmitting(false);
      return;
    }

    // New vendor specific validation
    if (showNewVendor) {
      if (!newVendorCategory.trim() || !newVendorCity.trim() || !newVendorContact.trim()) {
        alert("Please fill in all vendor details: Category, City, and Contact Information!");
        setSubmitting(false);
        return;
      }
    }

    // Prepare product data
    const productData = {
      Product_ID: productId,
      Name: productName,
      Vendor_ID: finalVendorId,
      Vendor_Name: finalVendorName,
      Cost_Price: Number(costPrice),
      Sale_Price: Number(salePrice),
      Current_Stock_Qty: Number(stockQty),
      Unit: unit
    };

    // Add new vendor data to productData if creating new vendor
    if (showNewVendor) {
      productData.New_Vendor_Data = {
        Vendor_ID: finalVendorId,
        Vendor_Name: finalVendorName,
        Category: newVendorCategory,
        City: newVendorCity,
        Contact: newVendorContact,
        // Add default values for other vendor fields
        Payment_Terms: "",
        Status: "Active"
      };
    }

    try {
      const res = await fetch("https://n8n.edutechpulse.online/webhook/Add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData)
      });

      if (!res.ok) throw new Error("Error uploading product");

      setSuccess("✅ Product Added Successfully!");
      
      // Reset form
      setProductName("");
      setCostPrice("");
      setSalePrice("");
      setStockQty("");
      setUnit("");
      setShowNewVendor(false);
      setNewVendorId("");
      setNewVendorName("");
      setNewVendorCategory("");
      setNewVendorCity("");
      setNewVendorContact("");
      
      
      if (!manuallyEntered) {
        await loadProductId();
      }

    } catch (err) {
      alert("Failed: " + err.message);
    }
    setSubmitting(false);
  };

  // Handle manual product ID input
  const handleProductIdChange = (value) => {
    setProductId(value);
    setManuallyEntered(value.trim() !== "");
  };

  // Generate next vendor ID suggestion
  const generateNextVendorId = () => {
    if (vendors.length === 0) return "V001";
    
    const lastVendor = vendors[vendors.length - 1];
    const lastNumber = parseInt(lastVendor.id.replace("V", "")) || 0;
    const nextNumber = String(lastNumber + 1).padStart(3, '0');
    return `V${nextNumber}`;
  };

  // Reset new vendor form when toggling
  const resetNewVendorForm = () => {
    setNewVendorId(generateNextVendorId());
    setNewVendorName("");
    setNewVendorCategory("");
    setNewVendorCity("");
    setNewVendorContact("");
  };

  // Initialize new vendor ID when component loads
  useEffect(() => {
    if (vendors.length > 0) {
      setNewVendorId(generateNextVendorId());
    }
  }, [vendors]);

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">➕ Add New Product</h1>
          <div className="text-sm">
            {loadingId ? (
              <span className="text-blue-600">⌛ Generating Product ID...</span>
            ) : idError ? (
              <span className="text-red-600">⚠️ Auto-ID Failed — Manual Mode</span>
            ) : manuallyEntered ? (
              <span className="text-purple-600">✏️ Manual Product ID</span>
            ) : (
              <span className="text-green-600">Next Product ID: <b className="font-mono">{productId}</b></span>
            )}
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Vendor Error Message */}
        {vendorError && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg text-sm">
            {vendorError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
          
          {/* Product ID Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product ID
              <button
                type="button"
                onClick={loadProductId}
                disabled={loadingId}
                className="ml-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
              >
                {loadingId ? "Loading..." : "Auto-generate"}
              </button>
            </label>
            <input
              type="text"
              value={productId}
              onChange={e => handleProductIdChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., P001"
            />
            <p className="text-xs text-gray-500 mt-1">
              {manuallyEntered 
                ? "You've manually entered the ID. Click 'Auto-generate' to get a new one."
                : "Product ID is auto-generated. You can edit it manually if needed."
              }
            </p>
          </div>

          {/* Product Name */}
          <Input
            label="Product Name"
            value={productName}
            set={setProductName}
            placeholder="Enter product name"
            required
          />

          {/* Vendor Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Vendor Information</h3>
              <button
                type="button"
                onClick={handleToggleNewVendor}
                className={`px-3 py-1 text-sm rounded-full ${
                  showNewVendor 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {showNewVendor ? '← Use Existing Vendor' : '➕ Add New Vendor'}
              </button>
            </div>

            {showNewVendor ? (
              // New Vendor Form
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-gray-700">New Vendor Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Vendor ID
                      <span className="text-xs text-gray-500 ml-2">
                        Auto-generated
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newVendorId}
                      onChange={e => setNewVendorId(e.target.value.toUpperCase())}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., V006"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Vendor Name *
                    </label>
                    <input
                      type="text"
                      value={newVendorName}
                      onChange={e => setNewVendorName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new vendor name"
                      required
                    />
                  </div>
                </div>
                
                {/* New Vendor Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Category *
                    </label>
                    <input
                      type="text"
                      value={newVendorCategory}
                      onChange={e => setNewVendorCategory(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Soft Drinks, Grocery, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={newVendorCity}
                      onChange={e => setNewVendorCity(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Karachi, Lahore, etc."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Information *
                    </label>
                    <input
                      type="text"
                      value={newVendorContact}
                      onChange={e => setNewVendorContact(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone number or email"
                      required
                    />
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 pt-2">
                  <p>ℹ️ All new vendor details will be saved to your Vendors_DB along with the product.</p>
                </div>
              </div>
            ) : (
              // Existing Vendor Selector
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Vendor
                  {loadingVendors && <span className="ml-2 text-xs text-blue-600">(Loading...)</span>}
                </label>
                <select
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  disabled={loadingVendors}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.name}>
                      {vendor.name} ({vendor.id}) {vendor.category && `- ${vendor.category}`}
                    </option>
                  ))}
                </select>
                
                {/* Vendor Details Preview */}
                {vendorName && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Vendor ID:</span>
                        <span className="font-medium ml-2">{vendorId}</span>
                      </div>
                      {vendors.find(v => v.name === vendorName)?.category && (
                        <div>
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium ml-2">
                            {vendors.find(v => v.name === vendorName)?.category}
                          </span>
                        </div>
                      )}
                      {vendors.find(v => v.name === vendorName)?.city && (
                        <div>
                          <span className="text-gray-600">City:</span>
                          <span className="font-medium ml-2">
                            {vendors.find(v => v.name === vendorName)?.city}
                          </span>
                        </div>
                      )}
                      {vendors.find(v => v.name === vendorName)?.contact && (
                        <div>
                          <span className="text-gray-600">Contact:</span>
                          <span className="font-medium ml-2">
                            {vendors.find(v => v.name === vendorName)?.contact}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price and Stock Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Cost Price (₨)"
              value={costPrice}
              set={setCostPrice}
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
            <Input
              label="Sale Price (₨)"
              value={salePrice}
              set={setSalePrice}
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Stock Quantity"
              value={stockQty}
              set={setStockQty}
              type="number"
              placeholder="0"
              min="0"
              required
            />
            <Input
              label="Unit"
              value={unit}
              set={setUnit}
              placeholder="Bottle, Pack, Kg, etc."
              required
            />
          </div>

          {/* Profit Preview */}
          {costPrice && salePrice && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Profit Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium ml-2">₨ {parseFloat(costPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Sale:</span>
                  <span className="font-medium ml-2">₨ {parseFloat(salePrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Profit:</span>
                  <span className="font-medium ml-2 text-green-600">
                    ₨ {(parseFloat(salePrice) - parseFloat(costPrice)).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Margin:</span>
                  <span className="font-medium ml-2 text-green-600">
                    {costPrice > 0 ? 
                      (((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(2) + '%'
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
              submitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Product...
              </span>
            ) : (
              showNewVendor ? '➕ Add Product & New Vendor' : '➕ Add Product'
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
          <p className="font-medium mb-1">ℹ️ Information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Product ID is auto-generated but can be edited manually</li>
            <li>Vendors are fetched live from your Google Sheets database</li>
            <li>You can add new vendors directly from this form</li>
            <li>When adding new vendor: Category, City, and Contact Information are required</li>
            <li>New vendor data will be included in the JSON payload for your n8n workflow</li>
            <li>Ensure sale price is higher than cost price for profit</li>
            <li>All data will be saved to your Product_Inventory sheet</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

// Reusable Input Component
function Input({ label, value, set, type = "text", placeholder = "", required = false, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => set(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        {...props}
      />
    </div>
  );
}