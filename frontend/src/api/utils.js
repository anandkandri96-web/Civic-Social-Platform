// Utility helpers for API response and error handling

/**
 * Extracts the inner data object from the axios response.
 * Works with the backend's { success, message, data } wrapper.
 *
 * @param {import('axios').AxiosResponse} res
 * @returns {any}
 */
export const getResponseData = (res) => {
  if (!res) return undefined;
  // backend wrapper uses res.data.data
  return res.data?.data ?? res.data;
};

/**
 * Standardize error message extraction from axios error.
 *
 * @param {any} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An error occurred';
  if (error.response && error.response.data) {
    const data = error.response.data;
    // Handle validateRequest middleware shape: { errors: [{ field, message }] }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.message).join(', ');
    }
    if (typeof data.message === 'string' && data.message) {
      return data.message;
    }
  }
  if (error.message) return error.message;
  return 'An error occurred';
};
