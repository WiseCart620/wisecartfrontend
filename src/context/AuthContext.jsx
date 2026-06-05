
import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';
import { Navigate } from 'react-router-dom';

const AuthContext = createContext({});


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      console.error('Token decode error:', error);
      return true;
    }
  };


  const validateToken = () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      setUser(null);
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      toast.error('Session expired. Please login again.');
      return false;
    }

    try {
      setUser(JSON.parse(userData));
      return true;
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    validateToken();
    setLoading(false);
  }, []);

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
      window.location.href = '/login';
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const checkTokenValid = () => {
    const token = localStorage.getItem('authToken');
    return token && !isTokenExpired(token);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isTokenValid: checkTokenValid
    }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};


export const AuthLoading = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-xl font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  return children;
};


export const ProtectedRoute = ({ children }) => {
  const { isTokenValid, loading } = useAuth();


  if (loading) {
    return null;
  }

  if (!isTokenValid()) {
    toast.error('Please login to continue');
    return <Navigate to="/login" replace />;
  }

  return children;
};


export const AdminRoute = ({ children }) => {
  const { user, isTokenValid, loading } = useAuth();


  if (loading) {
    return null;
  }

  if (!isTokenValid()) {
    toast.error('Please login to continue');
    return <Navigate to="/login" replace />;
  }

  if (!user || user.role !== 'ADMIN') {
    toast.error('Admin access required');
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const FinanceRoute = ({ children }) => {
  const { user, isTokenValid, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isTokenValid()) {
    toast.error('Please login to continue');
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'FINANCE') {
    toast.error('Access restricted');
    return <Navigate to="/sales" replace />;
  }

  return children;
};

export const AdminOrUserRoute = ({ children }) => {
  const { user, isTokenValid, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isTokenValid()) {
    toast.error('Please login to continue');
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'FINANCE') {
    toast.error('Access restricted');
    return <Navigate to="/sales" replace />;
  }

  return children;

};