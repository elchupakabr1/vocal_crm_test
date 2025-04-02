import axios, { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';

console.log('API URL from env:', process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:8000') + '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  maxRedirects: 0 // Запрещаем редиректы
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('Current token:', token);
  
  // Пропускаем запрос к /token без проверки токена
  if (config.url === '/token') {
    return config;
  }
  
  if (token) {
    // Убеждаемся, что заголовки существуют
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }
    
    // Добавляем токен в заголовок
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header set:', config.headers.Authorization);
    
    // Проверяем, что заголовок действительно установлен
    if (!config.headers.Authorization) {
      console.error('Failed to set Authorization header');
    }
  } else {
    console.warn('No token found in localStorage');
    // Отменяем запрос, если нет токена
    return Promise.reject(new Error('No token found'));
  }
  
  // Убираем слеш в конце URL, если он есть
  if (config.url && config.url.endsWith('/')) {
    config.url = config.url.slice(0, -1);
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

// Добавляем перехватчик для логирования ответов и обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers,
      config: {
        url: response.config.url,
        headers: response.config.headers
      }
    });
    return response;
  },
  (error) => {
    console.error('Response error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        headers: error.config?.headers
      }
    });

    // Обработка ошибки 401 (Unauthorized)
    if (error.response?.status === 401) {
      console.log('Token removed due to 401 error');
      localStorage.removeItem('token');
      // Возвращаем ошибку для обработки в компоненте
      return Promise.reject(new Error('Unauthorized'));
    }

    return Promise.reject(error);
  }
);

// Функция для аутентификации
export const login = async (username: string, password: string) => {
  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/token', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.data && response.data.access_token) {
      console.log('Token received:', response.data.access_token);
      // Сохраняем токен
      localStorage.setItem('token', response.data.access_token);
      
      // Проверяем, что токен сохранился
      const savedToken = localStorage.getItem('token');
      console.log('Token saved in localStorage:', savedToken);
      
      return response.data;
    } else {
      throw new Error('Неверный формат ответа от сервера');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Функция для выхода
export const logout = () => {
  console.log('Logging out, removing token');
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export default api; 