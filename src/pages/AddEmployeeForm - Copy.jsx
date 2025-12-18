import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddEmployeeForm() {
  const [formData, setFormData] = useState({
    Staff_ID: "",
    Name: "",
    Role: "Booker",
    Mobile: "",
    Assigned_Area_ID: "",
    Assigned_Area_Name: "",
    Base_Salary: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    // Validation
    if (!formData.Staff_ID || !formData.Name || !formData.Mobile || !formData.Base_Salary) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    const employeeData = {
      Staff_ID: formData.Staff_ID,
      Name: formData.Name,
      Role: formData.Role,
      Mobile: formData.Mobile,
      Assigned_Area_ID: formData.Assigned_Area_ID,
      Assigned_Area_Name: formData.Assigned_Area_Name,
      Base_Salary: Number(formData.Base_Salary)
    };

    try {
      console.log("Sending employee data:", employeeData);
      
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

      setSuccess("✅ Employee Added Successfully!");
      
      // Reset form after success
      setTimeout(() => {
        setFormData({
          Staff_ID: "",
          Name: "",
          Role: "Booker",
          Mobile: "",
          Assigned_Area_ID: "",
          Assigned_Area_Name: "",
          Base_Salary: ""
        });
      }, 2000);

    } catch (err) {
      console.error("Submission error:", err);
      setError(`Failed to add employee: ${err.message}`);
      
      // For testing/development
      if (process.env.NODE_ENV === "development") {
        console.log("DEV MODE: Data would be sent:", employeeData);
        setSuccess("✅ [DEV MODE] Employee data would be sent");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">👨‍💼 Add Employee</h1>
          <button 
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {success && (
          <div className="p-4 mb-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          
          {/* Information Note */}
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">📋 Format Guidelines</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li><strong>Staff ID:</strong> Use format like <code>BK-101</code>, <code>BK-102</code>, etc.</li>
              <li><strong>Area ID:</strong> Use format like <code>AREA-01</code>, <code>AREA-02</code>, etc.</li>
              <li><strong>Mobile:</strong> Enter 10-digit number without country code (e.g., 3001234567)</li>
              <li>Fields marked with <span className="text-red-500">*</span> are required</li>
            </ul>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Staff ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="Staff_ID"
                value={formData.Staff_ID}
                onChange={handleChange}
                placeholder="BK-101, BK-102, etc."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Full Name */}
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
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Role Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="Role"
                value={formData.Role}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Booker">Booker</option>
                <option value="Manager">Manager</option>
                <option value="Rider">Rider</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="Mobile"
                value={formData.Mobile}
                onChange={handleChange}
                placeholder="3001234567"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Assigned Area ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Area ID
              </label>
              <input
                type="text"
                name="Assigned_Area_ID"
                value={formData.Assigned_Area_ID}
                onChange={handleChange}
                placeholder="AREA-01, AREA-02, etc."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Assigned Area Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Area Name
              </label>
              <input
                type="text"
                name="Assigned_Area_Name"
                value={formData.Assigned_Area_Name}
                onChange={handleChange}
                placeholder="Gulgash Multan"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Base Salary (Full Width) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Salary (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="Base_Salary"
              value={formData.Base_Salary}
              onChange={handleChange}
              placeholder="50000"
              min="0"
              step="1000"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                loading 
                  ? "bg-blue-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              } transition duration-200`}
            >
              {loading ? "Adding Employee..." : "➕ Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}