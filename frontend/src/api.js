import axios from 'axios';

// Get the base URL from Vite's environment variables.
// import.meta.env.PROD is `true` during `npm run build`.
// This provides a safe fallback for local development if the .env file is missing.
const baseURL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:8080'; // Fallback for local dev, uses vite.config.js proxy

if (import.meta.env.PROD && !baseURL) {
  console.error("PRODUCTION ERROR: VITE_API_BASE_URL is not defined. The application will not be able to connect to the backend.");
}

// 1. Create an axios instance
const apiClient = axios.create({
  baseURL: baseURL,
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