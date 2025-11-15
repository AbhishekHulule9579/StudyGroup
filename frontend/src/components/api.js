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
    const  token = sessionStorage.getItem('token');

    if (token) {
      // If the token exists, add the 'Authorization' header
      config.headers.Authorization = `Bearer ${token}`;
    }
        return config;
  },
  (error) => {
    // Enhance error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      error.message = "No response from server. Please check your network connection.";
    }
    return Promise.reject(error); // For other errors
  }
);

// 3. Export the configured client
export default apiClient;