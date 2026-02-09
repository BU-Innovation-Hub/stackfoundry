export const getEnv = () => ({
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '/api/v1',
});
