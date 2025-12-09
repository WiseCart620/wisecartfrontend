// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function to decode JWT without external library
const decodeJWT = (token) => {
  try {
    // JWT has format: header.payload.signature
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  return decoded.exp < currentTime;
};

const getToken = () => {
  const token = localStorage.getItem('authToken');
  
  // Check if token exists and is not expired
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Only redirect if we're not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return null;
  }
  
  return token;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Only redirect if we're not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please login again.');
  }
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Request failed');
  }
  
  return response.json();
};

// Generic fetch function
const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  if (!token && !url.includes('/auth/')) {
    throw new Error('No valid token found');
  }
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: defaultHeaders,
  });
  
  return handleResponse(response);
};

export const api = {
  // GET request
  get: (endpoint) => 
    fetchWithAuth(endpoint, { method: 'GET' }),

  // POST request
  post: (endpoint, data) =>
    fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

 // PATCH request
patch: (endpoint, data = null, config = {}) => {
  const queryParams = config.params 
    ? '?' + new URLSearchParams(config.params).toString() 
    : '';
  
  return fetchWithAuth(`${endpoint}${queryParams}`, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
},

  // PUT request
  put: (endpoint, data) => {
    const options = {
      method: 'PUT',
      headers: {},
    };
    
    if (data !== null && data !== undefined) {
      options.body = JSON.stringify(data);
    }
    
    return fetchWithAuth(endpoint, options);
  },

  // DELETE request
  delete: (endpoint) =>
    fetchWithAuth(endpoint, { method: 'DELETE' }),

  // Upload file (multipart/form-data)
  upload: (endpoint, formData) => {
    const token = getToken();
    if (!token) {
      throw new Error('No valid token found');
    }
    
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(handleResponse);
  },

  // Download file
  download: (endpoint) => {
    const token = getToken();
    if (!token) {
      throw new Error('No valid token found');
    }
    
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(async (response) => {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      return response.blob();
    });
  },

  // Check token validity
  checkTokenValidity: () => {
    const token = localStorage.getItem('authToken');
    return token && !isTokenExpired(token);
  },

  // Get token expiration time (for debugging)
  getTokenExpiration: () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    const decoded = decodeJWT(token);
    return decoded ? decoded.exp : null;
  },
};