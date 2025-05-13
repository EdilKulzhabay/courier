import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
  // baseURL: 'http://192.168.10.3:4444', // Замените на ваш базовый URL API
  baseURL: 'https://api.tibetskayacrm.kz', // Замените на ваш базовый URL API
  timeout: 30000, // Таймаут запроса в миллисекундах
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем перехватчик для запросов
api.interceptors.request.use(
  async (config) => {
    // Здесь можно добавить токен авторизации
    const tokenData = await AsyncStorage.getItem('@token_data');
    if (tokenData) {
      const tokenDataObject = JSON.parse(tokenData);
      config.headers.Authorization = `Bearer ${tokenDataObject.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем перехватчик для ответов
api.interceptors.response.use(
  (response) => {
    // Логируем успешный запрос
    console.log('Успешный запрос:', {
      url: response.config.url,
      method: response.config.method,
      data: response.config.data,
      params: response.config.params,
      status: response.status
    });
    return response;
  },
  (error) => {
    // Здесь можно обработать ошибки
    if (error.response) {
      // Сервер вернул ошибку
      console.error('Ошибка ответа:', {
        url: error.config.url,
        method: error.config.method,
        data: error.config.data,
        params: error.config.params,
        status: error.response.status,
        error: error.response.data
      });
    } else if (error.request) {
      // Запрос был сделан, но ответ не получен
      console.error('Ошибка запроса:', {
        url: error.config.url,
        method: error.config.method,
        error: error.request
      });
    } else {
      // Что-то пошло не так при настройке запроса
      console.error('Ошибка:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api; 

//classpath('com.google.gms:google-services:4.4.2')
//apply plugin: 'com.google.gms.google-services'