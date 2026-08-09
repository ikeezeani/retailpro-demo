import axios from 'axios';

// In local/Docker Compose setups, requests go to the relative /api path and
// nginx proxies them to the backend container internally. On hosts that
// deploy the frontend and backend as separate services with their own public
// URLs (e.g. Render), set VITE_API_URL at build time to the full backend URL
// (e.g. https://retailpro-backend.onrender.com/api) so requests go there directly.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('retailpro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.data?.notInstalled && window.location.pathname !== '/install') {
      window.location.href = '/install';
    }
    if (err.response?.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/install') {
      localStorage.removeItem('retailpro_token');
      localStorage.removeItem('retailpro_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
