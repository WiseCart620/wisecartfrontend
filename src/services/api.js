import { toast } from 'react-hot-toast';

// API Base URL - automatically uses production or development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://wisecart.ph/api';

// Ultra-friendly rate limit configuration
const RATE_LIMIT_CONFIG = {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.2,
    showToast: true,
    autoRetry: true,
};

let activeRetryToast = null;


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
        console.error('JWT decode error:', error);
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

// ============================================
// RETRY LOGIC
// ============================================
const calculateRetryDelay = (attempt) => {
    return Math.min(
        RATE_LIMIT_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt),
        RATE_LIMIT_CONFIG.maxDelay
    );
};

const handleRateLimit = async (response, url, options, attempt = 0) => {
    if (response.status !== 429) return response;
    
    // Max retries reached
    if (attempt >= RATE_LIMIT_CONFIG.maxRetries) {
        if (activeRetryToast) {
            toast.dismiss(activeRetryToast);
            activeRetryToast = null;
        }
        toast.error('⚠️ Server is busy. Please try again in a moment.');
        return response;
    }

    // Get retry delay from server or calculate
    let retryDelay = 1;
    
    try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const data = await response.clone().json();
            retryDelay = data.retryAfter || data.resetIn || 1;
        }
    } catch (e) {
        retryDelay = parseInt(response.headers.get('Retry-After') || '1');
    }

    const finalDelay = Math.min(retryDelay * 1000, calculateRetryDelay(attempt));
    const delaySeconds = Math.ceil(finalDelay / 1000);

    // Show friendly toast
    if (RATE_LIMIT_CONFIG.showToast) {
        if (!activeRetryToast) {
            activeRetryToast = toast.loading(
                `⏳ Just a moment... retrying in ${delaySeconds}s`,
                { id: 'rate-limit-retry', duration: finalDelay + 500 }
            );
        } else {
            toast.loading(
                `⏳ Just a moment... retrying in ${delaySeconds}s`,
                { id: activeRetryToast, duration: finalDelay + 500 }
            );
        }
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, finalDelay));

    // Clear toast
    if (activeRetryToast) {
        toast.dismiss(activeRetryToast);
        activeRetryToast = null;
    }

    // Retry the request
    return fetchWithAuthRetry(url, options, attempt + 1);
};

// ============================================
// FETCH WITH AUTH AND RETRY
// ============================================
const fetchWithAuthRetry = async (url, options = {}, attempt = 0) => {
    const token = getToken();
    
    // Skip auth check for login/register endpoints
    if (!token && !url.includes('/auth/')) {
        toast.error('🔒 Please log in to continue');
        return { 
            success: false, 
            error: 'Authentication required', 
            status: 401 
        };
    }

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
        });

        // Handle rate limiting with auto-retry
        if (response.status === 429 && RATE_LIMIT_CONFIG.autoRetry) {
            return handleRateLimit(response, url, options, attempt);
        }

        // Clear retry toast on success
        if (activeRetryToast && response.ok) {
            toast.success('✅ Request completed!', { 
                id: activeRetryToast, 
                duration: 1000 
            });
            activeRetryToast = null;
        }

        return handleResponse(response);

    } catch (error) {
        // Network error - retry with backoff
        if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
            const delay = calculateRetryDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithAuthRetry(url, options, attempt + 1);
        }

        if (activeRetryToast) {
            toast.dismiss(activeRetryToast);
            activeRetryToast = null;
        }

        console.error('Network error:', error);
        toast.error('📡 Network error. Please check your connection.');
        
        return { 
            success: false, 
            error: 'Network error', 
            status: 0 
        };
    }
};

// ============================================
// RESPONSE HANDLER
// ============================================
const handleResponse = async (response) => {
    // Handle 401 Unauthorized
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        toast.error('🔒 Session expired. Please log in again.');
        
        if (!window.location.pathname.includes('/login')) {
            setTimeout(() => window.location.href = '/login', 1000);
        }
        
        return { 
            success: false, 
            error: 'Session expired', 
            status: 401 
        };
    }

    // Handle errors
    if (!response.ok) {
        let errorMessage = 'Request failed';
        
        try {
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || 'Request failed';
            } else {
                const text = await response.text();
                if (text?.trim()) {
                    errorMessage = text.replace(/^Error:\s*/i, '').trim();
                }
            }
        } catch (e) {
            errorMessage = response.statusText || 'Request failed';
        }

        // Don't show error toast for rate limits (already handled)
        if (response.status !== 429) {
            toast.error(`❌ ${errorMessage}`);
        }

        return { 
            success: false, 
            error: errorMessage, 
            status: response.status 
        };
    }

    // Handle successful responses
    const contentType = response.headers.get('content-type');

    // JSON response
    if (contentType?.includes('application/json')) {
        const data = await response.json();
        return { 
            success: true, 
            data, 
            status: response.status 
        };
    }

    // No content
    if (response.status === 204) {
        return { 
            success: true, 
            data: null, 
            status: 204 
        };
    }

    // Created response
    if (response.status === 201) {
        try {
            const data = await response.json();
            return { 
                success: true, 
                data, 
                status: 201 
            };
        } catch (e) {
            return { 
                success: true, 
                data: null, 
                status: 201 
            };
        }
    }

    // Text response
    const textData = await response.text();
    return { 
        success: true, 
        data: textData, 
        status: response.status 
    };
};

// ============================================
// BATCH REQUESTS
// ============================================
const batchRequests = async (requests, delayBetween = 50) => {
    const results = [];
    
    for (let i = 0; i < requests.length; i++) {
        const { endpoint, method = 'GET', data } = requests[i];
        
        try {
            const result = await fetchWithAuthRetry(endpoint, {
                method,
                body: data ? JSON.stringify(data) : undefined,
            });
            
            results.push(result);
            
            // Small delay between requests
            if (i < requests.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayBetween));
            }
        } catch (error) {
            results.push({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    return results;
};

// ============================================
// PUBLIC API
// ============================================
export const api = {
    /**
     * GET request
     */
    get: (endpoint) => 
        fetchWithAuthRetry(endpoint, { method: 'GET' }),

    /**
     * POST request
     */
    post: (endpoint, data) =>
        fetchWithAuthRetry(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * PATCH request
     */
    patch: (endpoint, data = null, config = {}) => {
        const queryParams = config.params 
            ? '?' + new URLSearchParams(config.params).toString() 
            : '';
        
        return fetchWithAuthRetry(`${endpoint}${queryParams}`, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    /**
     * PUT request
     */
    put: (endpoint, data) =>
        fetchWithAuthRetry(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    /**
     * DELETE request
     */
    delete: (endpoint) =>
        fetchWithAuthRetry(endpoint, { method: 'DELETE' }),

    /**
     * Batch multiple requests with smart spacing
     */
    batch: (requests, delayBetween = 50) =>
        batchRequests(requests, delayBetween),

    /**
     * Upload file with multipart/form-data
     */
    upload: async (endpoint, formData) => {
        const token = getToken();
        
        if (!token) {
            toast.error('🔒 Please log in to continue');
            return { 
                success: false, 
                error: 'Authentication required', 
                status: 401 
            };
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                },
                body: formData,
            });

            // Handle auth errors
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                toast.error('🔒 Session expired');
                setTimeout(() => window.location.href = '/login', 1000);
                return { 
                    success: false, 
                    error: 'Session expired', 
                    status: 401 
                };
            }

            // Handle rate limiting
            if (response.status === 429) {
                return handleRateLimit(response, endpoint, { 
                    method: 'POST', 
                    body: formData 
                });
            }
            
            // Handle errors
            if (!response.ok) {
                const errorMessage = await response.text() || 'Upload failed';
                toast.error(`❌ ${errorMessage}`);
                return { 
                    success: false, 
                    error: errorMessage, 
                    status: response.status 
                };
            }
            
            // Success
            const data = await response.json();
            return { 
                success: true, 
                data, 
                status: response.status 
            };
            
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('📡 Upload failed. Check your connection.');
            return { 
                success: false, 
                error: 'Network error', 
                status: 0 
            };
        }
    },

    /**
     * Download file as blob
     */
    download: async (endpoint) => {
        const token = getToken();
        
        if (!token) {
            toast.error('🔒 Please log in to continue');
            return { 
                success: false, 
                error: 'Authentication required', 
                status: 401 
            };
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                },
            });

            // Handle auth errors
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                toast.error('🔒 Session expired');
                setTimeout(() => window.location.href = '/login', 1000);
                return { 
                    success: false, 
                    error: 'Session expired', 
                    status: 401 
                };
            }
            
            // Handle errors
            if (!response.ok) {
                const errorMessage = await response.text() || 'Download failed';
                toast.error(`❌ ${errorMessage}`);
                return { 
                    success: false, 
                    error: errorMessage, 
                    status: response.status 
                };
            }
            
            // Success
            const blob = await response.blob();
            return { 
                success: true, 
                data: blob, 
                status: response.status 
            };
            
        } catch (error) {
            console.error('Download error:', error);
            toast.error('📡 Download failed');
            return { 
                success: false, 
                error: 'Network error', 
                status: 0 
            };
        }
    },

    /**
     * Check if token is valid
     */
    checkTokenValidity: () => {
        const token = localStorage.getItem('authToken');
        return token && !isTokenExpired(token);
    },

    /**
     * Get token expiration timestamp
     */
    getTokenExpiration: () => {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        
        const decoded = decodeJWT(token);
        return decoded?.exp || null;
    },

    /**
     * Configure rate limit behavior
     */
    configureRateLimit: (config) => {
        Object.assign(RATE_LIMIT_CONFIG, config);
    },

    /**
     * Get current rate limit configuration
     */
    getRateLimitConfig: () => ({ 
        ...RATE_LIMIT_CONFIG 
    }),

    /**
     * Manually clear retry toast
     */
    clearRetryToast: () => {
        if (activeRetryToast) {
            toast.dismiss(activeRetryToast);
            activeRetryToast = null;
        }
    },
};

export default api;