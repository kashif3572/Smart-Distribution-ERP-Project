import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
      }
    }
  }, [])

  const login = ({ id, password }) => {
    // Demo users with specific passwords
    const demo = {
      'admin': { id: 'admin', role: 'admin', name: 'Admin User', password: '1234' },
      'rider1': { id: 'rider1', role: 'rider', name: 'Ali', password: '1234' },
	  'rider2': { id: 'rider2', role: 'rider', name: 'Usman', password: '1234' },
	  'rider3': { id: 'rider3', role: 'rider', name: 'Faheem', password: '1234' },
      
      // Salesmen with specific passwords
      'BK-101': { id: 'BK-101', role: 'sales', name: 'John Doe', password: 'John101' },
      'BK-102': { id: 'BK-102', role: 'sales', name: 'Sarah Khan', password: 'Sarah102' },
      'BK-103': { id: 'BK-103', role: 'sales', name: 'Mike Wilson', password: 'Mike103' },
      'BK-104': { id: 'BK-104', role: 'sales', name: 'Emily Davis', password: 'Emily104' },
      'BK-105': { id: 'BK-105', role: 'sales', name: 'Ali Raza', password: 'Ali105' },
      'BK-106': { id: 'BK-106', role: 'sales', name: 'Hassan Ahmed', password: 'Hassan106' },
      'BK-107': { id: 'BK-107', role: 'sales', name: 'Usman Tariq', password: 'Usman107' },
      'BK-108': { id: 'BK-108', role: 'sales', name: 'Fatima Noor', password: 'Fatima108' },
      'BK-109': { id: 'BK-109', role: 'sales', name: 'Ayesha Malik', password: 'Ayesha109' },
      'BK-110': { id: 'BK-110', role: 'sales', name: 'Adnan Sharif', password: 'Adnan110' },
      'BK-111': { id: 'BK-111', role: 'sales', name: 'Maria Iqbal', password: 'Maria111' },
      'BK-112': { id: 'BK-112', role: 'sales', name: 'Rehan Siddiqui', password: 'Rehan112' },
      'BK-113': { id: 'BK-113', role: 'sales', name: 'Hamza Ali', password: 'Hamza113' },
      'BK-114': { id: 'BK-114', role: 'sales', name: 'Sana Javed', password: 'Sana114' },
      'BK-115': { id: 'BK-115', role: 'sales', name: 'Salman Khan', password: 'Salman115' },
      
      // Legacy sales accounts (for backward compatibility)
      'sales1': { id: 'sales1', role: 'sales', name: 'Salesman', password: '1234' },
    }

    // Check if user exists and password matches
    if (demo[id] && demo[id].password === password) {
      const { password: _, ...userWithoutPassword } = demo[id]; // Remove password from user object
      
      // Store user in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userWithoutPassword))
      localStorage.setItem('userId', userWithoutPassword.id)
      localStorage.setItem('role', userWithoutPassword.role)
      localStorage.setItem('userName', userWithoutPassword.name)
      
      setUser(userWithoutPassword)
      return { ok: true, user: userWithoutPassword }
    }
    
    return { 
      ok: false, 
      message: 'Invalid credentials. Please check your ID and password.' 
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('userId')
    localStorage.removeItem('role')
    localStorage.removeItem('userName')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)