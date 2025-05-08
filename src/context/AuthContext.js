'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading until we check localStorage
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on initial load
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        // TODO: Add token validation here (e.g., check expiry)
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        // Clear invalid stored data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false); // Finished loading initial auth state
  }, []);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
    router.push('/'); // Redirect home after login
  };

  const logout = async () => {
    try {
        // Optional: Call the backend signout endpoint
        await fetch('/api/auth/signout', { method: 'POST' });
    } catch (error) {
        console.error("Signout API call failed:", error);
        // Proceed with client-side logout even if API call fails
    } finally {
        // Clear client-side state and storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        router.push('/'); // Redirect to home page
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user, // Boolean flag for convenience
    loading,
    login, // Provide login function (though signin page handles it directly now)
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
