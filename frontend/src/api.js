import axios from 'axios';

// Get the base URL from the environment variables
// Vite uses `import.meta.env.VITE_...`
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Create an axios instance with the base URL
const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

// (Optional but recommended) Add an interceptor to include the JWT token in requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token'); // Or wherever you store your token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
