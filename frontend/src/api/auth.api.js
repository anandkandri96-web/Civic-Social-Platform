import api from './axios';
import { getResponseData } from './utils';

/**
 * Login user
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: Object, token: string }>} 
 */
export const login = async (credentials) => {
  const res = await api.post('/auth/login', credentials);
  return getResponseData(res);
};

/**
 * Register new user
 * @param {{ name: string, email: string, password: string, role?: string }} userData
 * @returns {Promise<{ user: Object, token: string }>} 
 */
export const register = async (userData) => {
  const res = await api.post('/auth/register', userData);
  return getResponseData(res);
};

/**
 * Get currently authenticated user
 * @returns {Promise<Object>} user object
 */
export const getMe = async () => {
  const res = await api.get('/auth/me');
  return getResponseData(res);
};
