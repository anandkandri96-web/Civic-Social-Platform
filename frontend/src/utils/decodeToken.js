import jwtDecode from 'jwt-decode';

export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};
