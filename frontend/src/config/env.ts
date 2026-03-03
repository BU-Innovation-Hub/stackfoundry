export const getEnv = () => ({
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
});

/**
 * Get the API base URL for direct fetch calls
 */
export const getApiBaseUrl = (): string => {
  return process.env.REACT_APP_API_BASE_URL || '/api/v1';
};
