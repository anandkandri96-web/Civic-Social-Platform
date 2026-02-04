import api from './axios';

/**
 * Login user
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, message: string, data: { user: Object, token: string } }>}
 */
export const login = async (credentials) => {
  return await api.post('/auth/login', credentials);
};

/**
 * Register new user
 * @param {{ name: string, email: string, password: string, role?: string }} userData
 * @returns {Promise<{ success: boolean, message: string, data: { user: Object, token: string } }>}
 */
export const register = async (userData) => {
  return await api.post('/auth/register', userData);
};

/**
 * Get currently authenticated user
 * @returns {Promise<{ success: boolean, message: string, data: Object }>}
 */
export const getMe = async () => {
  return await api.get('/auth/me');
};
