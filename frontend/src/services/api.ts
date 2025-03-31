import axios from 'axios';

console.log('API URL from env:', process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:8000') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Добавляем перехватчик для логирования запросов
api.interceptors.request.use((config) => {
  console.log('Request config:', {
    url: config.url,
    baseURL: config.baseURL,
    method: config.method,
    headers: config.headers,
    data: config.data,
    fullUrl: `${config.baseURL}${config.url}`,
  });
  return config;
});

// Добавляем перехватчик для логирования ответов
api.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers,
    });
    return response;
  },
  (error) => {
    console.error('Response error:', {
      message: error.message,
      config: error.config,
      response: error.response,
      fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown',
    });
    return Promise.reject(error);
  }
);

export default api; 