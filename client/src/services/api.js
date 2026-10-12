import axios from "axios";

// Read and normalize production API base URL from Vite environment variable
// Trailing slashes are stripped to prevent double-slash segment issues when joining endpoints
const rawBaseURL = import.meta.env.VITE_API_URL || "";
const baseURL = rawBaseURL.replace(/\/+$/, "");

const API = axios.create({
  baseURL, // Points to production backend (e.g. Render) when configured, or relative path in local dev
  timeout: 90000 // 90 seconds timeout accommodating Render free-tier cold starts
});

// Request interceptor to automatically attach authorization header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to catch token expiry or errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Only redirect if not already on login or register page
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
