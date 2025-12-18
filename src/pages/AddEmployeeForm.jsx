import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";

export default function AddEmployeeForm() {
  const [activeSection, setActiveSection] = useState("addEmployee");
  const [formData, setFormData] = useState({
    Staff_ID: "",
    Name: "",
    Role: "Booker",
    Mobile: "",
    Assigned_Area_ID: "",
    Assigned_Area_Name: "",
    Base_Salary: "",
    Username: "",
    Password: "",
    Account_Status: "Active"
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  // State for Change Status
  const [changeStatusData, setChangeStatusData] = useState({
    Staff_ID: "",
    Name: "",
    Account_Status: "Active"
  });
  const [statusLoading, setStatusLoading] = useState(false);
  
  // State for View Staff
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedRole, setSelectedRole] = useState("All");
  const [viewLoading, setViewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for Reset Password
  const [resetPasswordData, setResetPasswordData] = useState({
    Staff_ID: "",
    Name: "",
    NewPassword: ""
  });
  const [resetLoading, setResetLoading] = useState(false);
  
  // State for Delete Staff
  const [deleteData, setDeleteData] = useState({
    Staff_ID: "",
    Name: ""
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Generate username automatically
  useEffect(() => {
    if (formData.Name && formData.Staff_ID && !formData.Username) {
      const firstName = formData.Name.split(" ")[0].toLowerCase();
      const idNumber = formData.Staff_ID.split("-")[1] || "001";
      const username = `${firstName}.${formData.Role.toLowerCase()}${idNumber}`;
      setFormData(prev => ({ ...prev, Username: username }));
    }
  }, [formData.Name, formData.Staff_ID, formData.Role]);

  // Handle main form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    // Validation
    if (!formData.Staff_ID || !formData.Name || !formData.Mobile || 
        !formData.Base_Salary || !formData.Username || !formData.Password) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    // Hash the password with bcrypt for NEW employees
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(formData.Password, salt);

    const employeeData = {
      Staff_ID: formData.Staff_ID,
      Name: formData.Name,
      Role: formData.Role,
      Mobile: formData.Mobile,
      Assigned_Area_ID: formData.Assigned_Area_ID,
      Assigned_Area_Name: formData.Assigned_Area_Name,
      Base_Salary: Number(formData.Base_Salary),
      Username: formData.Username,
      Password_Hash: passwordHash, // Store bcrypt hash for new employees
      Account_Status: formData.Account_Status
    };

    try {
      const response = await fetch("https://n8n.edutechpulse.online/webhook/add-staff", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      setSuccess(`✅ Employee Added Successfully! 
      
Username: ${formData.Username}
Password: ${formData.Password}

⚠️ Save these credentials - they won't be shown again!`);
      
      // Reset form
      setTimeout(() => {
        setFormData({
          Staff_ID: "",
          Name: "",
          Role: "Booker",
          Mobile: "",
          Assigned_Area_ID: "",
          Assigned_Area_Name: "",
          Base_Salary: "",
          Username: "",
          Password: "",
          Account_Status: "Active"
        });
      }, 3000);

    } catch (err) {
      setError(`Failed to add employee: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Status
  const handleChangeStatus = async (e) => {
    e.preventDefault();
    setStatusLoading(true);
    
    if (!changeStatusData.Staff_ID || !changeStatusData.Name) {
      alert("Please enter Staff ID and Name");
      setStatusLoading(false);
      return;
    }

    try {
      const response = await fetch("https://n8n.edutechpulse.online/webhook/change-status", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          id: changeStatusData.Staff_ID,
          name: changeStatusData.Name,
          status: changeStatusData.Account_Status
        }),
      });

      if (response.ok) {
        alert("✅ Status updated successfully!");
        setChangeStatusData({
          Staff_ID: "",
          Name: "",
          Account_Status: "Active"
        });
        if (activeSection === "viewStaff") {
          handleViewStaff();
        }
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setStatusLoading(false);
    }
  };

  // Transform API data
  const transformStaffData = (apiData) => {
    if (!apiData || !apiData.data || !Array.isArray(apiData.data) || apiData.data.length === 0) {
      return [];
    }
    
    const rows = apiData.data;
    const headers = rows[0];
    
    const staffArray = rows.slice(1).map(row => {
      const staff = {};
      headers.forEach((header, index) => {
        const cleanHeader = header.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        staff[cleanHeader] = row[index] || '';
      });
      return staff;
    });
    
    return staffArray;
  };

  // Handle View Staff
  const handleViewStaff = async () => {
    setViewLoading(true);
    try {
      const READ_API_URL = `${import.meta.env.VITE_API_URL || 'https://sheets-api-545260361851.us-central1.run.app'}/api/read/Staff_Master`;
      
      const response = await fetch(READ_API_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const transformedData = transformStaffData(data);
        setStaffList(transformedData);
        setFilteredStaff(transformedData);
        setActiveSection("viewStaff");
      } else {
        throw new Error("Invalid data format");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setViewLoading(false);
    }
  };

  // Handle Reset Password - IMPORTANT: Always use bcrypt for NEW resets
  const handleResetPassword = async () => {
    if (!resetPasswordData.Staff_ID || !resetPasswordData.Name || !resetPasswordData.NewPassword) {
      alert("Please enter all fields");
      return;
    }
    
    if (!window.confirm(`Reset password for ${resetPasswordData.Name} (${resetPasswordData.Staff_ID})?`)) {
      return;
    }
    
    setResetLoading(true);
    
    try {
      // Always use bcrypt for password resets
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(resetPasswordData.NewPassword, salt);
      
      const payload = {
        Staff_ID: resetPasswordData.Staff_ID,
        Name: resetPasswordData.Name,
        Password_Hash: passwordHash, // Store bcrypt hash
        New_Password: resetPasswordData.NewPassword
      };
      
      const response = await fetch("https://n8n.edutechpulse.online/webhook/reset-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`✅ Password reset successfully!

Username: ${resetPasswordData.Staff_ID}
New Password: ${resetPasswordData.NewPassword}

⚠️ Share with employee immediately!`);
        
        setResetPasswordData({
          Staff_ID: "",
          Name: "",
          NewPassword: ""
        });
        
        if (activeSection === "viewStaff") {
          handleViewStaff();
        }
      } else {
        throw new Error("Reset failed");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  // Generate random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordData({...resetPasswordData, NewPassword: password});
  };

  // Handle Delete Staff
  const handleDeleteStaff = async () => {
    if (!deleteData.Staff_ID || !deleteData.Name) {
      alert("Please enter Staff ID and Name");
      return;
    }
    
    if (!window.confirm(`Permanently delete ${deleteData.Name} (${deleteData.Staff_ID})?`)) {
      return;
    }
    
    setDeleteLoading(true);
    
    try {
      const response = await fetch("https://n8n.edutechpulse.online/webhook/delet-staff", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          id: deleteData.Staff_ID,
          name: deleteData.Name
        }),
      });

      if (response.ok) {
        alert("✅ Staff deleted!");
        setDeleteData({ Staff_ID: "", Name: "" });
        setActiveSection("viewStaff");
        handleViewStaff();
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter and search
  const filterStaffByRole = (role) => {
    setSelectedRole(role);
    let filtered = staffList;
    
    if (role !== "All") {
      filtered = filtered.filter(staff => staff.Role === role);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(staff => 
        (staff.Name && staff.Name.toLowerCase().includes(term)) ||
        (staff.Staff_ID && staff.Staff_ID.toLowerCase().includes(term)) ||
        (staff.Mobile && staff.Mobile.includes(term)) ||
        (staff.Username && staff.Username.toLowerCase().includes(term))
      );
    }
    
    setFilteredStaff(filtered);
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    let filtered = staffList;
    
    if (selectedRole !== "All") {
      filtered = filtered.filter(staff => staff.Role === selectedRole);
    }
    
    if (term) {
      filtered = filtered.filter(staff => 
        (staff.Name && staff.Name.toLowerCase().includes(term)) ||
        (staff.Staff_ID && staff.Staff_ID.toLowerCase().includes(term)) ||
        (staff.Mobile && staff.Mobile.includes(term)) ||
        (staff.Username && staff.Username.toLowerCase().includes(term))
      );
    }
    
    setFilteredStaff(filtered);
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">👨‍💼 Employee Management</h1>
          <button 
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {success && (
          <div className="p-4 mb-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <div className="whitespace-pre-line">{success}</div>
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow">
          <button
            onClick={() => setActiveSection("addEmployee")}
            className={`px-4 py-2 rounded-md ${activeSection === "addEmployee" ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            ➕ Add Employee
          </button>
          <button
            onClick={handleViewStaff}
            className={`px-4 py-2 rounded-md ${activeSection === "viewStaff" ? "bg-green-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            👁️ View Staff
          </button>
          <button
            onClick={() => setActiveSection("changeStatus")}
            className={`px-4 py-2 rounded-md ${activeSection === "changeStatus" ? "bg-yellow-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            🔄 Change Status
          </button>
          <button
            onClick={() => setActiveSection("resetPassword")}
            className={`px-4 py-2 rounded-md ${activeSection === "resetPassword" ? "bg-purple-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            🔑 Reset Password
          </button>
          <button
            onClick={() => setActiveSection("deleteStaff")}
            className={`px-4 py-2 rounded-md ${activeSection === "deleteStaff" ? "bg-red-500 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            🗑️ Delete Staff
          </button>
        </div>

        {/* ADD EMPLOYEE FORM */}
        {activeSection === "addEmployee" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">➕ Add New Employee</h2>
            
            
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="Staff_ID"
                    value={formData.Staff_ID}
                    onChange={handleChange}
                    placeholder="BK-101"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="Name"
                    value={formData.Name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="Role"
                    value={formData.Role}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md"
                  >
                    <option value="Booker">Booker</option>
                    <option value="Manager">Manager</option>
                    <option value="Rider">Rider</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="Mobile"
                    value={formData.Mobile}
                    onChange={handleChange}
                    placeholder="3001234567"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="Username"
                    value={formData.Username}
                    onChange={handleChange}
                    placeholder="john.booker101"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="Password"
                    value={formData.Password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                    minLength="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area ID
                  </label>
                  <input
                    type="text"
                    name="Assigned_Area_ID"
                    value={formData.Assigned_Area_ID}
                    onChange={handleChange}
                    placeholder="AREA-01"
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Name
                  </label>
                  <input
                    type="text"
                    name="Assigned_Area_Name"
                    value={formData.Assigned_Area_Name}
                    onChange={handleChange}
                    placeholder="Gulgash Multan"
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="Base_Salary"
                    value={formData.Base_Salary}
                    onChange={handleChange}
                    placeholder="50000"
                    className="w-full p-3 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="Account_Status"
                    value={formData.Account_Status}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {loading ? "Adding..." : "➕ Add Employee"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW STAFF SECTION */}
        {activeSection === "viewStaff" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold">👥 Staff List ({filteredStaff.length} employees)</h2>
              
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full md:w-80 p-3 pl-10 border border-gray-300 rounded-md"
                  />
                  <div className="absolute left-3 top-3 text-gray-400">🔍</div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={selectedRole}
                    onChange={(e) => filterStaffByRole(e.target.value)}
                    className="p-3 border border-gray-300 rounded-md"
                  >
                    <option value="All">All Roles</option>
                    <option value="Booker">Booker</option>
                    <option value="Manager">Manager</option>
                    <option value="Rider">Rider</option>
                    <option value="Other">Other</option>
                  </select>
                  
                  <button
                    onClick={handleViewStaff}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            
            {viewLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading staff data...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No staff members found.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStaff.map((staff, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{staff.Staff_ID}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{staff.Name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              staff.Role === 'Manager' ? 'bg-purple-100 text-purple-800' :
                              staff.Role === 'Booker' ? 'bg-blue-100 text-blue-800' :
                              staff.Role === 'Rider' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {staff.Role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{staff.Mobile}</td>
                          <td className="px-4 py-3">
                            <div className="text-gray-900">{staff.Assigned_Area_Name || '—'}</div>
                            <div className="text-xs text-gray-500">{staff.Assigned_Area_ID || ''}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            PKR {parseInt(staff.Base_Salary || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{staff.Username}</code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              staff.Account_Status === 'Active' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {staff.Account_Status || 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setChangeStatusData({
                                    Staff_ID: staff.Staff_ID,
                                    Name: staff.Name,
                                    Account_Status: staff.Account_Status || 'Active'
                                  });
                                  setActiveSection("changeStatus");
                                }}
                                className="text-yellow-600 hover:text-yellow-800 text-sm"
                                title="Change Status"
                              >
                                🔄
                              </button>
                              <button
                                onClick={() => {
                                  setResetPasswordData({
                                    Staff_ID: staff.Staff_ID,
                                    Name: staff.Name,
                                    NewPassword: ""
                                  });
                                  setActiveSection("resetPassword");
                                }}
                                className="text-purple-600 hover:text-purple-800 text-sm"
                                title="Reset Password"
                              >
                                🔑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  Showing {filteredStaff.length} of {staffList.length} employees
                </div>
              </>
            )}
          </div>
        )}

        {/* CHANGE STATUS SECTION */}
        {activeSection === "changeStatus" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">🔄 Change Employee Status</h2>
            <form onSubmit={handleChangeStatus} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID *</label>
                  <input
                    type="text"
                    name="Staff_ID"
                    value={changeStatusData.Staff_ID}
                    onChange={(e) => setChangeStatusData({...changeStatusData, Staff_ID: e.target.value})}
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="Name"
                    value={changeStatusData.Name}
                    onChange={(e) => setChangeStatusData({...changeStatusData, Name: e.target.value})}
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    name="Account_Status"
                    value={changeStatusData.Account_Status}
                    onChange={(e) => setChangeStatusData({...changeStatusData, Account_Status: e.target.value})}
                    className="w-full p-3 border rounded-md"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md disabled:bg-yellow-300"
                >
                  {statusLoading ? "Updating..." : "Update Status"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("viewStaff")}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RESET PASSWORD SECTION */}
        {activeSection === "resetPassword" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">🔑 Reset Employee Password</h2>
            
            <div className="bg-purple-50 p-4 rounded border border-purple-200 mb-6">
              <h3 className="font-bold text-purple-800 mb-2">⚠️ Important:</h3>
              <p className="text-purple-700 text-sm">
                Resetting password will convert it to <strong>bcrypt hash</strong>. Old plain text passwords will be replaced.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID *</label>
                  <input
                    type="text"
                    name="Staff_ID"
                    value={resetPasswordData.Staff_ID}
                    onChange={(e) => setResetPasswordData({...resetPasswordData, Staff_ID: e.target.value})}
                    placeholder="BK-101"
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="Name"
                    value={resetPasswordData.Name}
                    onChange={(e) => setResetPasswordData({...resetPasswordData, Name: e.target.value})}
                    placeholder="John Doe"
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="NewPassword"
                      value={resetPasswordData.NewPassword}
                      onChange={(e) => setResetPasswordData({...resetPasswordData, NewPassword: e.target.value})}
                      className="flex-1 p-3 border rounded-md"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
              
              {resetPasswordData.NewPassword && (
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="font-medium text-gray-700 mb-2">New Password:</div>
                  <div className="flex items-center gap-3">
                    <code className="bg-white px-4 py-2 rounded border font-mono text-lg flex-1">
                      {resetPasswordData.NewPassword}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(resetPasswordData.NewPassword)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-md disabled:bg-purple-300"
                >
                  {resetLoading ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  onClick={() => setActiveSection("viewStaff")}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE STAFF SECTION */}
        {activeSection === "deleteStaff" && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4 text-red-600">🗑️ Delete Staff Member</h2>
            
            <div className="bg-red-50 p-4 rounded border border-red-200 mb-6">
              <p className="text-red-700 font-bold">⚠️ Permanent Action - Cannot be undone!</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID *</label>
                  <input
                    type="text"
                    name="Staff_ID"
                    value={deleteData.Staff_ID}
                    onChange={(e) => setDeleteData({...deleteData, Staff_ID: e.target.value})}
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="Name"
                    value={deleteData.Name}
                    onChange={(e) => setDeleteData({...deleteData, Name: e.target.value})}
                    className="w-full p-3 border rounded-md"
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteStaff}
                  disabled={deleteLoading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:bg-red-300"
                >
                  {deleteLoading ? "Deleting..." : "Delete Permanently"}
                </button>
                <button
                  onClick={() => setActiveSection("viewStaff")}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}