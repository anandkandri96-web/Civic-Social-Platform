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
    if (typeof error.response.data.message === 'string' && error.response.data.message) {
      return error.response.data.message;
    }
  }
  if (error.message) return error.message;
  return 'An error occurred';
};
