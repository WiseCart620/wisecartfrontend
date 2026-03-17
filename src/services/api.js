import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://152.42.235.205/api';


// ─── Inactivity logout (1 hour) ──────────────────────────────────
const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour
let inactivityTimer = null;


const resetInactivityTimer = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        handleInactivityLogout();
    }, INACTIVITY_LIMIT);

};

const handleInactivityLogout = () => {
    clearTimeout(inactivityTimer);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    toast.error('⏰ You have been logged out due to 1 hour of inactivity.', { duration: 5000 });
    if (!window.location.pathname.includes('/login')) {
        setTimeout(() => { window.location.href = '/login'; }, 1500);
    }
};

export const startActivityTracking = () => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity);
                if (elapsed > INACTIVITY_LIMIT) {
                    handleInactivityLogout();
                    return;
                }
            }
            // Tab came back into focus — reset timer
            resetInactivityTimer();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer(); // start timer immediately
};

export const stopActivityTracking = () => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
    clearTimeout(inactivityTimer);
};

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

const calculateRetryDelay = (attempt) => {
    return Math.min(
        RATE_LIMIT_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt),
        RATE_LIMIT_CONFIG.maxDelay
    );
};

const clearRetryToast = () => {
    if (activeRetryToast) {
        toast.dismiss(activeRetryToast);
        activeRetryToast = null;
    }
};

const handleRateLimit = async (response, url, options, attempt = 0) => {
    if (response.status !== 429) return response;

    // Max retries reached
    if (attempt >= RATE_LIMIT_CONFIG.maxRetries) {
        clearRetryToast();
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
                { duration: finalDelay + 1000 } // Add duration to auto-dismiss
            );
        }
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, finalDelay));

    // Clear toast before retry
    clearRetryToast();

    // Retry the request
    return fetchWithAuthRetry(url, options, attempt + 1);
};

const fetchWithAuthRetry = async (url, options = {}, attempt = 0) => {
    const token = getToken();

    // Skip auth check for login/register endpoints
    if (!token && !url.includes('/auth/')) {
        toast.error('🔒 Please log in to continue', { duration: 3000 });
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

        // Handle response
        return handleResponse(response);

    } catch (error) {
        // Network error - retry with backoff
        if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
            const delay = calculateRetryDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithAuthRetry(url, options, attempt + 1);
        }

        clearRetryToast();
        console.error('Network error:', error);
        toast.error('📡 Network error. Please check your connection.', { duration: 3000 });

        return {
            success: false,
            error: 'Network error',
            status: 0
        };
    }
};

const handleResponse = async (response) => {
    // Clear any lingering retry toasts
    clearRetryToast();

    // Handle 401 Unauthorized
    if (response.status === 401) {
        stopActivityTracking();
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('lastActivity');

        // Check if backend flagged inactivity specifically
        try {
            const data = await response.clone().json();
            if (data?.reason === 'inactivity') {
                toast.error('⏰ Logged out due to 1 hour of inactivity.', { duration: 5000 });
            } else {
                toast.error('🔒 Session expired. Please log in again.', { duration: 3000 });
            }
        } catch {
            toast.error('🔒 Session expired. Please log in again.', { duration: 3000 });
        }

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
            const text = await response.text();

            if (text?.trim()) {
                try {
                    const jsonError = JSON.parse(text);
                    if (jsonError.errors && typeof jsonError.errors === 'object') {
                        const fieldErrors = Object.entries(jsonError.errors)
                            .map(([field, message]) => `${field}: ${message}`)
                            .join(', ');
                        errorMessage = fieldErrors || jsonError.error || 'Validation failed';
                    } else if (jsonError.message) {
                        errorMessage = jsonError.message;
                    } else if (jsonError.error) {
                        errorMessage = jsonError.error;
                    } else {
                        errorMessage = text;
                    }
                } catch {
                    errorMessage = text;
                }
            }
        } catch (e) {
            errorMessage = response.statusText || 'Request failed';
        }

        if (response.status !== 429 && errorMessage.length <= 300) {
            toast.error(`❌ ${errorMessage}`, { duration: 3000 });
        }

        return {
            success: false,
            error: errorMessage,
            status: response.status
        };
    }

    // Handle successful responses
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
        const data = await response.json();
        return {
            success: true,
            data,
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

    const textData = await response.text();
    return {
        success: true,
        data: textData,
        status: response.status
    };
};

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

export const api = {
    get: (endpoint) => fetchWithAuthRetry(endpoint, { method: 'GET' }),

    post: (endpoint, data) => fetchWithAuthRetry(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    patch: (endpoint, data = null, config = {}) => {
        const queryParams = config.params
            ? '?' + new URLSearchParams(config.params).toString()
            : '';
        return fetchWithAuthRetry(`${endpoint}${queryParams}`, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    },

    put: (endpoint, data) => fetchWithAuthRetry(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    }),

    delete: (endpoint) => fetchWithAuthRetry(endpoint, { method: 'DELETE' }),

    batch: (requests, delayBetween = 50) => batchRequests(requests, delayBetween),

    upload: async (endpoint, formData) => {
        const token = getToken();

        if (!token) {
            toast.error('🔒 Please log in to continue', { duration: 3000 });
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

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                toast.error('🔒 Session expired', { duration: 3000 });
                setTimeout(() => window.location.href = '/login', 1000);
                return {
                    success: false,
                    error: 'Session expired',
                    status: 401
                };
            }

            if (response.status === 429) {
                return handleRateLimit(response, endpoint, {
                    method: 'POST',
                    body: formData
                });
            }

            if (!response.ok) {
                const errorMessage = await response.text() || 'Upload failed';
                toast.error(`❌ ${errorMessage}`, { duration: 3000 });
                return {
                    success: false,
                    error: errorMessage,
                    status: response.status
                };
            }

            const data = await response.json();
            return {
                success: true,
                data,
                status: response.status
            };

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('📡 Upload failed. Check your connection.', { duration: 3000 });
            return {
                success: false,
                error: 'Network error',
                status: 0
            };
        }
    },

    download: async (endpoint) => {
        const token = getToken();

        if (!token) {
            toast.error('🔒 Please log in to continue', { duration: 3000 });
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

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                toast.error('🔒 Session expired', { duration: 3000 });
                setTimeout(() => window.location.href = '/login', 1000);
                return {
                    success: false,
                    error: 'Session expired',
                    status: 401
                };
            }

            if (!response.ok) {
                const errorMessage = await response.text() || 'Download failed';
                toast.error(`❌ ${errorMessage}`, { duration: 3000 });
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
            console.error('Download error:', error);
            toast.error('📡 Download failed', { duration: 3000 });
            return {
                success: false,
                error: 'Network error',
                status: 0
            };
        }
    },

    checkTokenValidity: () => {
        const token = localStorage.getItem('authToken');
        return token && !isTokenExpired(token);
    },

    getTokenExpiration: () => {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        const decoded = decodeJWT(token);
        return decoded?.exp || null;
    },

    configureRateLimit: (config) => {
        Object.assign(RATE_LIMIT_CONFIG, config);
    },

    getRateLimitConfig: () => ({
        ...RATE_LIMIT_CONFIG
    }),

    clearRetryToast: clearRetryToast,
};

export { API_BASE_URL };
export default api;