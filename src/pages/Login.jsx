import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { 
  FaUser, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaBuilding, 
  FaTruck, 
  FaShoppingCart,
  FaChartLine,
  FaShieldAlt,
  FaDatabase,
  FaCloud,
  FaMobileAlt,
  FaCode,
  FaUsers,
  FaHeart
} from 'react-icons/fa'

export default function Login() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = auth.login({ id, password })
      
      if (!res.ok) {
        throw new Error(res.message || 'Invalid credentials')
      }

      // Get the user object from the auth response
      const user = res.user
      
      // Store user data in localStorage
      localStorage.setItem("userId", user.id)
      localStorage.setItem("role", user.role)
      localStorage.setItem("userName", user.name)

      // 🚀 Redirect based on role with smooth transition
      setTimeout(() => {
        if (user.role === "admin") {
          nav("/")
        } else if (user.role === "sales") {
          nav("/sales-dashboard")
        } else if (user.role === "rider") {
          nav("/rider-dashboard")
        } else {
          nav("/")
        }
      }, 300)

    } catch (err) {
      setError(err.message)
      // Add shake animation effect
      const form = e.target
      form.classList.add('shake')
      setTimeout(() => form.classList.remove('shake'), 500)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo account selection
  const demoAccounts = [
    { id: 'admin', password: '1234', role: 'admin', icon: <FaChartLine />, name: 'Admin User', color: 'from-purple-600 to-pink-600' },
    { id: 'BK-101', password: 'John101', role: 'sales', icon: <FaShoppingCart />, name: 'John Doe', color: 'from-blue-600 to-cyan-500' },
    { id: 'BK-102', password: 'Sarah102', role: 'sales', icon: <FaShoppingCart />, name: 'Sarah Khan', color: 'from-emerald-600 to-teal-500' },
    { id: 'rider1', password: '1234', role: 'rider', icon: <FaTruck />, name: 'Delivery Rider', color: 'from-orange-600 to-red-500' },
  ]

  const handleDemoAccount = (account) => {
    setId(account.id)
    setPassword(account.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Main Login Container */}
      <div className="relative w-full max-w-6xl flex flex-col lg:flex-row bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
        
        {/* Left Side - Branding & Info */}
        <div className="lg:w-2/5 p-8 lg:p-12 flex flex-col justify-between bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90 text-white relative overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300 rounded-full -translate-x-48 translate-y-48"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/30">
                <FaBuilding className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Smart Distribution ERP</h1>
                <p className="text-blue-200 text-sm font-light">Enterprise Resource Planning Suite</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full mb-4">
                <FaShieldAlt className="mr-2 text-green-400" />
                <span className="text-sm font-medium">Enterprise Grade Security</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">Welcome to the Future of Distribution</h2>
              <p className="text-blue-100/90 leading-relaxed">
                Transform your distribution operations with our intelligent ERP platform. 
                Seamlessly manage inventory, process orders, track deliveries, and gain actionable insights 
                to drive business growth.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <FaChartLine className="text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Real-time Analytics</h4>
                  <p className="text-sm text-blue-200/80">Live dashboards with predictive insights</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <FaShoppingCart className="text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Order Management</h4>
                  <p className="text-sm text-blue-200/80">Streamlined sales and automated processing</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <FaTruck className="text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Delivery Intelligence</h4>
                  <p className="text-sm text-blue-200/80">GPS tracking and route optimization</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <FaDatabase className="text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Cloud Integration</h4>
                  <p className="text-sm text-blue-200/80">Seamless Google Sheets synchronization</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Credit Section - Enhanced */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <FaCode className="text-blue-300 text-sm" />
                  <span className="text-sm font-medium text-blue-200">Developed with ❤️ by</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <span className="text-lg font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Kashif Bilal
                  </span>
                  <span className="text-sm text-blue-200/80 hidden sm:block">|</span>
                  <div className="flex items-center gap-1">
                    <FaUsers className="text-xs text-blue-300" />
                    <span className="text-sm font-medium text-white">Team 38</span>
                  </div>
                  <span className="text-sm text-blue-200/80 hidden sm:block">|</span>
                  <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full">
                    Innovation Batch 2025
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 border-2 border-white/30"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-400 border-2 border-white/30"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 border-2 border-white/30"></div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center sm:text-left">
              <p className="text-xs text-blue-200/70">
                Need assistance? Contact our support team at{' '}
                <a href="mailto:Kashifbilalkashi786@gmail.com" className="font-semibold text-blue-300 hover:text-white transition-colors">
                  Kashifbilalkashi786@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="lg:w-3/5 p-8 lg:p-12 bg-white relative">
          {/* Tech Pattern Background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="relative z-10 max-w-md mx-auto">
            {/* Form Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl mb-4 shadow-lg">
                <FaShieldAlt className="text-2xl text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Secure Access Portal</h2>
              <p className="text-gray-600">Enter your credentials to continue to your dashboard</p>
            </div>

            <form onSubmit={submit} className="space-y-6">
              {/* User ID Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <FaUser className="mr-2 text-gray-400" />
                  Employee ID
                </label>
                <div className="relative group">
                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="Enter your ID (e.g., BK-101)"
                    className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 group-hover:border-blue-400"
                    required
                  />
                  <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-xs text-gray-500 pl-1">Format: BK-XXX for sales team</p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <FaLock className="mr-2 text-gray-400" />
                  Password
                </label>
                <div className="relative group">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pl-11 pr-11 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 group-hover:border-blue-400"
                    required
                  />
                  <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-pulse">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">Authentication Failed</p>
                      <p className="mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <FaLock className="mr-2" />
                    Sign In to Dashboard
                  </span>
                )}
              </button>

              {/* Quick Demo Accounts */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center flex items-center justify-center">
                  <FaMobileAlt className="mr-2 text-blue-500" />
                  Quick Demo Access
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {demoAccounts.map((account, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDemoAccount(account)}
                      className={`p-3 rounded-xl text-left transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 shadow-md ${account.color.replace('from-', 'bg-gradient-to-r ')} text-white relative overflow-hidden group`}
                    >
                      <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors"></div>
                      <div className="relative">
                        <div className="flex items-center space-x-2 mb-1">
                          {account.icon}
                          <span className="text-xs font-semibold uppercase bg-white/20 px-2 py-1 rounded-full">
                            {account.role}
                          </span>
                        </div>
                        <div className="text-sm font-medium truncate">{account.name}</div>
                        <div className="text-xs opacity-90 truncate">ID: {account.id}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Instructions */}
              <div className="text-center pt-4">
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full mb-2">
                  <FaCloud className="mr-2 text-blue-500" />
                  <span className="text-sm text-blue-600">Cloud Sync Active</span>
                </div>
                <p className="text-sm text-gray-600">
                  Sales Team: Use your BK-xxx ID with matching password
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Example credentials: BK-101 / John101 • BK-102 / Sarah102 • Admin / 1234
                </p>
              </div>
            </form>

            {/* System Status & Version Info */}
            <div className="mt-8">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">System Status: Operational</span>
                      <div className="text-xs text-gray-500">All services running normally</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-gray-500">v2.4.1</div>
                    <div className="text-xs text-gray-500">Last sync: Just now</div>
                  </div>
                </div>
                
                {/* Connection Status */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Google Sheets API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Database Connection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Authentication Service</span>
                  </div>
                </div>
              </div>
              
              {/* Footer Copyright */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  © 2024 Smart Distribution ERP. All rights reserved. 
                  <span className="mx-2">•</span>
                  <span className="text-blue-600 font-medium">Powered by Team 38 Innovation</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Watermark */}
      <div className="fixed bottom-4 right-4">
        <div className="flex items-center space-x-2 px-3 py-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
          <FaHeart className="text-red-400 text-xs animate-pulse" />
          <span className="text-xs text-white/70 font-medium">Made with passion by</span>
          <span className="text-xs text-white font-bold">Kashif Bilal & Team 38</span>
        </div>
      </div>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes shake {
          0%, 100% {transform: translateX(0);}
          10%, 30%, 50%, 70%, 90% {transform: translateX(-5px);}
          20%, 40%, 60%, 80% {transform: translateX(5px);}
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .shake {
          animation: shake 0.5s ease-in-out;
        }

        .gradient-animate {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
      `}</style>
    </div>
  )
}