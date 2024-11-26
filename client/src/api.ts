import axios from "axios";
// Create an Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    // Handle errors globally
    const { response } = error;
    if (response) {
      // Handle error responses
      alert(JSON.stringify(response.data));
    } else {
      console.error("Network error:", error.message);
      alert("Network error. Please try again later.");
    }
    return Promise.reject(error);
  }
);

// Function to register a new user
export const registerUser = async (username: String, password: String) => {
  return await api.post("/auth/register", { username, password });
};

// Function to log in a user
export const loginUser = async (username: String, password: String) => {
  return await api.post("/auth/login", { username, password });
};

// Function to log out a user
export const logoutUser = async () => {
  return await api.post("/auth/logout");
};
export default api;
