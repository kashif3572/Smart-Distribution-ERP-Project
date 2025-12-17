// src/pages/AddCustomer.jsx - WEBHOOK VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AddCustomer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingShops, setExistingShops] = useState([]);
  const [existingAreas, setExistingAreas] = useState(['AREA-01', 'AREA-02', 'AREA-03', 'AREA-04', 'AREA-05']);
  const [customArea, setCustomArea] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    Shop_ID: '',
    Shop_Name: '',
    Owner_Mobile: '',
    Owner_Name: '',
    Area_ID: '',
    Credit_Limit: '0',
    Current_Balance: '0',
    Last_Visit_Date: new Date().toISOString().split('T')[0]
  });

  // Webhook URL
  const WEBHOOK_URL = 'https://n8n.edutechpulse.online/webhook/Add-customer';
  const READ_API_URL = `${import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app'}/api/read/Customers_DB`;

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    fetchExistingData();
  }, [user, navigate]);

  // Fetch existing shop IDs and areas from your existing read API
  const fetchExistingData = async () => {
    try {
      setFetchingData(true);
      console.log('📡 Fetching existing customer data from:', READ_API_URL);
      
      const response = await fetch(READ_API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ API Response:', result);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Extract shop IDs (assuming column A)
        const shops = result.data.slice(1) // Skip header row
          .map(row => row[0]) // Get first column (Shop_ID)
          .filter(Boolean) // Remove empty values
          .filter(id => typeof id === 'string' && id.toString().startsWith('SHP-'));
        
        setExistingShops(shops);
        console.log(`📊 Found ${shops.length} existing shops`);
        
        // Extract unique areas (assuming column E)
        const areas = [...new Set(
          result.data.slice(1)
            .map(row => row[4]) // Get Area_ID column (5th column, index 4)
            .filter(Boolean)
            .filter(area => area && area.toString().trim() !== '')
            .map(area => area.toString().trim())
        )];
        
        if (areas.length > 0) {
          setExistingAreas(prev => [...new Set([...prev, ...areas])]);
          console.log(`📍 Found ${areas.length} existing areas`);
        }
      } else {
        console.warn('⚠️ No valid data found, using defaults');
        // If no data yet, start with SHP-001
        setExistingShops([]);
      }
    } catch (err) {
      console.error('❌ Error fetching existing data:', err);
      // Continue with default data if fetch fails
      setError(`Could not load existing data: ${err.message}. You can still proceed manually.`);
    } finally {
      setFetchingData(false);
    }
  };

  // Generate next Shop_ID based on existing SHP-XXX format
  const generateNextShopId = () => {
    setGeneratingId(true);
    
    try {
      let maxNum = 0;
      
      // Find the highest number from existing SHP-XXX IDs
      existingShops.forEach(shopId => {
        const match = shopId.toString().match(/SHP[-_]?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      });
      
      // If no existing shops found, start from 1
      if (maxNum === 0 && existingShops.length === 0) {
        maxNum = 0; // Start from 001
      } else if (maxNum === 0) {
        maxNum = existingShops.length;
      }
      
      const nextNum = maxNum + 1;
      const newShopId = `SHP-${nextNum.toString().padStart(3, '0')}`;
      
      setFormData(prev => ({
        ...prev,
        Shop_ID: newShopId
      }));
      
      console.log(`🆔 Generated Shop ID: ${newShopId} (based on ${maxNum} existing shops)`);
    } catch (err) {
      console.error('Error generating Shop ID:', err);
      // Fallback to simple generation
      const fallbackId = `SHP-${(existingShops.length + 1).toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, Shop_ID: fallbackId }));
    } finally {
      setGeneratingId(false);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'Area_ID' && value === 'custom') {
      // User selected "Add New Area", show custom input
      setFormData(prev => ({ ...prev, [name]: '' }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle custom area input
  const handleCustomAreaChange = (e) => {
    const value = e.target.value;
    setCustomArea(value);
    setFormData(prev => ({
      ...prev,
      Area_ID: value
    }));
  };

  // Add new area to dropdown
  const addNewArea = () => {
    if (customArea && customArea.trim() !== '') {
      const newArea = customArea.trim().toUpperCase();
      if (!existingAreas.includes(newArea)) {
        setExistingAreas(prev => [...prev, newArea]);
      }
      setFormData(prev => ({ ...prev, Area_ID: newArea }));
      setCustomArea('');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = [];
    
    if (!formData.Shop_ID.trim()) errors.push('Shop ID is required');
    if (!formData.Shop_Name.trim()) errors.push('Shop Name is required');
    if (!formData.Owner_Name.trim()) errors.push('Owner Name is required');
    if (!formData.Owner_Mobile.trim()) errors.push('Mobile Number is required');
    if (!formData.Area_ID.trim()) errors.push('Area is required');
    
    // Validate mobile number
    const mobileRegex = /^[0-9]{10,12}$/;
    const cleanMobile = formData.Owner_Mobile.replace(/\D/g, '');
    if (cleanMobile && !mobileRegex.test(cleanMobile)) {
      errors.push('Mobile number must be 10-12 digits');
    }
    
    // Validate credit limit
    if (formData.Credit_Limit && (isNaN(formData.Credit_Limit) || parseFloat(formData.Credit_Limit) < 0)) {
      errors.push('Credit Limit must be a positive number');
    }
    
    // Check if Shop_ID already exists
    if (existingShops.includes(formData.Shop_ID)) {
      errors.push('Shop ID already exists. Please use a different ID.');
    }
    
    return errors;
  };

  // Handle form submission to n8n webhook
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      setLoading(false);
      return;
    }

    try {
      // Prepare data for n8n webhook in the format it expects
      const customerData = {
        // Match your Google Sheets column headers exactly
        "Shop_ID": formData.Shop_ID,
        "Shop_Name": formData.Shop_Name,
        "Owner_Mobile": formData.Owner_Mobile,
        "Owner_Name": formData.Owner_Name,
        "Area_ID": formData.Area_ID,
        "Credit_Limit": formData.Credit_Limit || '0',
        "Current_Balance": formData.Current_Balance || '0',
        "Last_Visit_Date": formData.Last_Visit_Date || new Date().toISOString().split('T')[0],
        // Additional metadata
        "timestamp": new Date().toISOString(),
        "added_by": user?.email || 'admin',
        "source": "Admin Panel"
      };

      console.log('📤 Sending to n8n webhook:', WEBHOOK_URL);
      console.log('📄 Data:', customerData);

      // Send data to n8n webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      console.log('📨 Webhook response status:', response.status);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        console.log('📝 Non-JSON response:', text.substring(0, 200));
        
        // n8n often returns simple text or HTML responses
        // If we get any 2xx status, assume success
        if (response.ok) {
          responseData = { success: true, message: 'Data sent to n8n workflow successfully' };
        } else {
          throw new Error(`Webhook returned: ${text.substring(0, 100)}`);
        }
      }

      if (!response.ok && !responseData.success) {
        throw new Error(responseData.error || responseData.message || `HTTP ${response.status}`);
      }

      // Success!
      const successMsg = responseData.message || '✅ Customer Added successfully into database ';
      setSuccess(successMsg);
      console.log('✅ Success:', successMsg);
      
      // Add new shop to existing list for immediate UI update
      setExistingShops(prev => [...prev, formData.Shop_ID]);
      
      // Add new area to existing areas if it's new
      if (formData.Area_ID && !existingAreas.includes(formData.Area_ID)) {
        setExistingAreas(prev => [...prev, formData.Area_ID]);
      }

      // Reset form after success
      setTimeout(() => {
        setFormData({
          Shop_ID: '',
          Shop_Name: '',
          Owner_Mobile: '',
          Owner_Name: '',
          Area_ID: '',
          Credit_Limit: '0',
          Current_Balance: '0',
          Last_Visit_Date: new Date().toISOString().split('T')[0]
        });
        setCustomArea('');
        // Don't clear success immediately if you want user to see it
      }, 3000);
	  setTimeout(() => {
  setSuccess('');
}, 5000);

    } catch (err) {
      console.error('❌ Error sending to n8n:', err);
      setError(`Failed to send data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Refresh existing data
  const handleRefreshData = () => {
    setError('');
    fetchExistingData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-600 to-orange-500 text-white p-3 rounded-xl shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span>Add New Customer (Shop)</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Add new shops/customers. Data will be appended to Google Sheets automatically.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-gray-500">
                  Existing shops: <span className="font-bold">{existingShops.length}</span> • 
                  Last ID: <span className="font-mono text-blue-600">{existingShops[existingShops.length - 1] || 'None'}</span>
                </p>
                <button
                  onClick={handleRefreshData}
                  disabled={fetchingData}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                >
                  {fetchingData ? (
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh
                </button>
              </div>
              
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => navigate('/customers')}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View All
              </button>
            </div>
          </div>

          {/* Info Card 
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">n8n Webhook Integration</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Data will be sent to your n8n workflow at <span className="font-mono text-blue-600">{WEBHOOK_URL}</span>.
                  The workflow should append this data to your Google Sheets "Customers_DB".
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Shop ID Generation:</span> Reads live data from your Google Sheets via existing API to generate sequential IDs.
                </p>
              </div>
            </div>
          </div> */}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-800">Shop/Customer Details</h2>
            <p className="text-gray-600 text-sm">Fill in the shop information below</p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-red-800">Error</h4>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium text-green-800">Success!</h4>
                  <p className="text-green-700 mt-1">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Shop ID Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Shop ID <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      name="Shop_ID"
                      value={formData.Shop_ID}
                      onChange={handleChange}
                      placeholder="e.g., SHP-001"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      required
                    />
                    <div className="absolute right-3 top-3 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generateNextShopId}
                    disabled={generatingId || fetchingData}
                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-w-[100px]"
                  >
                    {generatingId ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Generating
                      </div>
                    ) : (
                      'Generate ID'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {fetchingData ? (
                    <span className="flex items-center">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Loading existing data...
                    </span>
                  ) : formData.Shop_ID && existingShops.includes(formData.Shop_ID) ? (
                    <span className="text-red-600">⚠️ This Shop ID already exists</span>
                  ) : (
                    `Next available: SHP-${(existingShops.length + 1).toString().padStart(3, '0')}`
                  )}
                </p>
              </div>

              {/* Shop Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="Shop_Name"
                    value={formData.Shop_Name}
                    onChange={handleChange}
                    placeholder="e.g., City Supermarket"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Full name of the shop/store</p>
              </div>

              {/* Owner Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Owner Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="Owner_Name"
                    value={formData.Owner_Name}
                    onChange={handleChange}
                    placeholder="e.g., Waqas Ali"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Full name of the shop owner</p>
              </div>

              {/* Owner Mobile Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Owner Mobile <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="Owner_Mobile"
                    value={formData.Owner_Mobile}
                    onChange={handleChange}
                    placeholder="e.g., 923406540001"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">10-12 digit mobile number</p>
              </div>

              {/* Area Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Area <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="Area_ID"
                    value={formData.Area_ID || ''}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    required
                  >
                    <option value="">Select Area</option>
                    {existingAreas.map((area, index) => (
                      <option key={index} value={area}>
                        {area}
                      </option>
                    ))}
                    <option value="custom">➕ Add New Area</option>
                  </select>
                  <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Delivery/service area</p>
                
                {/* Custom Area Input */}
                {(formData.Area_ID === '' && customArea) || formData.Area_ID === 'custom' ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={customArea}
                      onChange={handleCustomAreaChange}
                      placeholder="Enter new area (e.g., AREA-06)"
                      className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addNewArea}
                      className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Credit Limit Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Credit Limit (Rs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="Credit_Limit"
                    value={formData.Credit_Limit}
                    onChange={handleChange}
                    placeholder="e.g., 300000"
                    min="0"
                    step="100"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Maximum credit allowed (0 for cash only)</p>
              </div>

              {/* Current Balance Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Current Balance (Rs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="Current_Balance"
                    value={formData.Current_Balance}
                    onChange={handleChange}
                    placeholder="e.g., 4362"
                    min="0"
                    step="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    readOnly
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Initial balance (usually 0)</p>
              </div>

              {/* Last Visit Date Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Last Visit Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="Last_Visit_Date"
                    value={formData.Last_Visit_Date}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Date of last visit/service</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Note:</span> Data will be sent to n8n webhook which appends to Google Sheets
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        Shop_ID: '',
                        Shop_Name: '',
                        Owner_Mobile: '',
                        Owner_Name: '',
                        Area_ID: '',
                        Credit_Limit: '0',
                        Current_Balance: '0',
                        Last_Visit_Date: new Date().toISOString().split('T')[0]
                      });
                      setCustomArea('');
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    disabled={loading}
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Customer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>n8n Webhook Integration • Real-time Data Append • Admin Panel</p>
          
        </footer>
      </div>
    </div>
  );
}