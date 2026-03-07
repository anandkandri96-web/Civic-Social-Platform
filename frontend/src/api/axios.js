import axios from "axios";

/**
 * Axios instance
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

/**
 * Safely get JWT token
 */
const getToken = () => {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
};

/**
 * Centralized logout handler
 */
const handleLogout = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (error) {
    console.warn("Local storage cleanup failed during logout:", error);
  }

  if (typeof window !== "undefined") {
    window.location.replace("/");
  }
};

/**
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 * ✅ DO NOT MUTATE RESPONSE SHAPE
 */
api.interceptors.response.use(
  (response) => {
    // ✅ return full axios response
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      handleLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
