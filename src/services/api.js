import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const decodeJWT = (token) => {
  try {
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

const isTokenExpired = (token) => {
  if (!token) return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

const getToken = () => {
  const token = localStorage.getItem('authToken');
  
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return null;
  }
  
  return token;
};

const handleResponse = async (response) => {
  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    toast.error('Session expired. Please login again.');
    
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    
    return {
      success: false,
      error: 'Session expired. Please login again.',
      status: 401
    };
  }
  
  // Handle error responses (400, 404, 500, etc.)
  if (!response.ok) {
    let errorMessage = 'Request failed';
    
    try {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || 'Request failed';
      } else {
        // Handle text/plain responses (like your backend error messages)
        const text = await response.text();
        if (text && text.trim()) {
          // Remove "Error: " prefix if it exists
          errorMessage = text.replace(/^Error:\s*/i, '').trim();
        }
      }
    } catch (parseError) {
      errorMessage = response.statusText || 'Request failed';
    }
    
    // Show error toast
    toast.error(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      status: response.status
    };
  }
  
  // Handle successful responses
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    return {
      success: true,
      data: data,
      status: response.status
    };
  }
  
  if (response.status === 204) {
    return {
      success: true,
      data: null,
      status: 204
    };
  }
  
  // Try to parse 201 as JSON first
  if (response.status === 201) {
    try {
      const data = await response.json();
      return {
        success: true,
        data: data,
        status: 201
      };
    } catch (e) {
      // If response body is empty
      return {
        success: true,
        data: null,
        status: 201
      };
    }
  }
  
  const textData = await response.text();
  return {
    success: true,
    data: textData,
    status: response.status
  };
};

// Generic fetch function
const fetchWithAuth = async (url, options = {}) => {
  const token = getToken();
  if (!token && !url.includes('/auth/')) {
    toast.error('Session expired. Please login again.');
    return {
      success: false,
      error: 'No valid token found',
      status: 401
    };
  }
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: defaultHeaders,
    });
    
    return await handleResponse(response);
  } catch (error) {
    // Network error
    toast.error('Network error. Please check your connection.');
    return {
      success: false,
      error: 'Network error',
      status: 0
    };
  }
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
  upload: async (endpoint, formData) => {
    const token = getToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      return {
        success: false,
        error: 'No valid token found',
        status: 401
      };
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return {
          success: false,
          error: 'Session expired',
          status: 401
        };
      }
      
      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || 'Upload failed';
          } else {
            const text = await response.text();
            if (text && text.trim()) {
              errorMessage = text.replace(/^Error:\s*/i, '').trim();
            }
          }
        } catch (e) {
          errorMessage = response.statusText || 'Upload failed';
        }
        
        toast.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
          status: response.status
        };
      }
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      return {
        success: true,
        data: data,
        status: response.status
      };
    } catch (error) {
      toast.error('Network error. Please check your connection.');
      return {
        success: false,
        error: 'Network error',
        status: 0
      };
    }
  },

  // Download file
  download: async (endpoint) => {
    const token = getToken();
    if (!token) {
      toast.error('Session expired. Please login again.');
      return {
        success: false,
        error: 'No valid token found',
        status: 401
      };
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
        return {
          success: false,
          error: 'Session expired',
          status: 401
        };
      }
      
      if (!response.ok) {
        let errorMessage = 'Download failed';
        try {
          const text = await response.text();
          if (text && text.trim()) {
            errorMessage = text.replace(/^Error:\s*/i, '').trim();
          }
        } catch (e) {
          errorMessage = response.statusText || 'Download failed';
        }
        
        toast.error(errorMessage);
        return {
          success: false,
          error: errorMessage,
          status: response.status
        };
      }
      
      const blob = await response.blob();
      return {
        success: true,
        data: blob,
        status: response.status
      };
    } catch (error) {
      toast.error('Network error. Please check your connection.');
      return {
        success: false,
        error: 'Network error',
        status: 0
      };
    }
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