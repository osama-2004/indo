const BASE_URL = import.meta.env.VITE_API_URL || ''; // Use VITE_API_URL in production, fallback to relative paths in local dev.

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('indus_token');
  const headers = { ...options.headers };

  // Inject Bearer token if present
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set default body content type if it's not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Auto log out on 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem('indus_token');
      localStorage.removeItem('indus_user');
      window.dispatchEvent(new Event('authChanged'));
      // Optional: redirect to login if not already there
      const currentPath = window.location.pathname + window.location.hash;
      if (!currentPath.includes('/login') && !currentPath.includes('/signup')) {
        window.location.hash = '/login';
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Unauthorized access');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error ${response.status}`);
    }

    // Return empty object on 204 No Content
    if (response.status === 204) {
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request Error [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
}

export const client = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' })
};
