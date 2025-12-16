// src/App.jsx - UPDATED VERSION
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Purchases from './pages/Purchases'
import Delivery from './pages/Delivery'
import SalesDashboard from './pages/sales-dashboard'
import RiderDashboard from './pages/rider-dashboard'
import OrderPage from "./pages/Orders";
import AddProduct from './pages/AddProduct'
import SalesOrder from './pages/SalesOrder'
import AddEmployeeForm from './pages/AddEmployeeForm';
import APITest from './components/APITest'; // This should now work
import AssignDelivery from './pages/AssignDelivery';


import { AuthProvider, useAuth } from './auth/AuthContext'
import AdminLayout from "./layouts/AdminLayout";

function Protected({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />

  const role = localStorage.getItem("role")
  if (allowedRoles && !allowedRoles.includes(role))
    return <div className="p-8 text-red-600 font-bold text-xl">🚫 Access Denied</div>

  return children
}

export default function App() {
  return (
    <AuthProvider>
      {/* APITest will appear as overlay on all pages */}
      <APITest minimal={true}  />
      
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* ================== ADMIN AREA WRAPPED IN LAYOUT ================== */}
        <Route path="/" element={
          <Protected allowedRoles={["admin"]}>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </Protected>
        } />
		<Route path="/assign-delivery" element={
  <Protected allowedRoles={['admin']}>
    <AdminLayout>
      <AssignDelivery />
    </AdminLayout>
  </Protected>
} />

        <Route path="/orders" element={
          <Protected allowedRoles={["admin","sales"]}>
            <AdminLayout>
              <OrderPage />
            </AdminLayout>
          </Protected>
        } />

        <Route path="/customers" element={
          <Protected allowedRoles={['admin','sales']}>
            <AdminLayout>
              <Customers />
            </AdminLayout>
          </Protected>
        } />

        <Route path="/purchases" element={
          <Protected allowedRoles={['admin']}>
            <AdminLayout>
              <Purchases />
            </AdminLayout>
          </Protected>
        } />
		
        <Route path="/delivery" element={
          <Protected allowedRoles={['admin','rider']}>
            <AdminLayout>
              <Delivery />
            </AdminLayout>
          </Protected>
        } />
		

        <Route path="/add-product" element={
          <Protected allowedRoles={["admin"]}>
            <AdminLayout>
              <AddProduct />
            </AdminLayout>
          </Protected>
        } />

        {/* ================== ADD EMPLOYEE FORM ================== */}
        <Route path="/add-employee" element={
          <Protected allowedRoles={["admin"]}>
            <AdminLayout>
              <AddEmployeeForm />
            </AdminLayout>
          </Protected>
        } />

        {/* ================== SALES ORDER PAGE ================== */}
        <Route path="/sales-order" element={
          <Protected allowedRoles={["sales"]}>
            <SalesOrder />
          </Protected>
        } />

        {/* ================== NON-ADMIN USER ROUTES ================== */}
        <Route path="/sales-dashboard" element={
          <Protected allowedRoles={["sales"]}>
            <SalesDashboard />
          </Protected>
        } />

        <Route path="/rider-dashboard" element={
          <Protected allowedRoles={["rider"]}>
            <RiderDashboard />
          </Protected>
        } />

        {/* DEFAULT REDIRECT */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}