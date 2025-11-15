import axios from 'axios';

// 1. Create an axios instance
const apiClient = axios.create({
  // Use the environment variable for the base URL.
  // Vite uses `import.meta.env.VITE_API_BASE_URL`.
  // This will be 'https://studygroup-production-aa02.up.railway.app' in production.
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// 2. Add a request interceptor to automatically attach the JWT token
apiClient.interceptors.request.use(
  (config) => {
    // Get the token from sessionStorage
    const token = sessionStorage.getItem('token');
    if (token) {
      // If the token exists, add the 'Authorization' header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// 3. Export the configured client
export default apiClient;