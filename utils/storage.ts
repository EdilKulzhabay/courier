import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourierData, TokenData, NotificationTokenData, Order } from '../types/interfaces';

const COURIER_DATA_KEY = '@courier_data';
const TOKEN_DATA_KEY = '@token_data';
const NOTIFICATION_TOKEN_DATA_KEY = '@notification_token_data';
const ORDER_DATA_KEY = '@order_data';

export const saveCourierData = async (data: CourierData): Promise<void> => {
  try {
    await AsyncStorage.setItem(COURIER_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при сохранении данных курьера:', error);
    throw error;
  }
};

export const saveTokenData = async (data: TokenData): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error);
    throw error;
  }
};

export const saveNotificationTokenData = async (data: NotificationTokenData): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_TOKEN_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при сохранении токена:', error);
    throw error;
  }
};

export const saveOrderData = async (data: Order): Promise<void> => {
  try {
    await AsyncStorage.setItem(ORDER_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при сохранении заказа:', error);
    throw error;
  }
};

export const getCourierData = async (): Promise<CourierData | null> => {
  try {
    const data = await AsyncStorage.getItem(COURIER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Ошибка при получении данных курьера:', error);
    return null;
  }
};

export const getTokenData = async (): Promise<TokenData | null> => {
  try {
    const data = await AsyncStorage.getItem(TOKEN_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Ошибка при получении токена:', error);
    return null;
  }
};

export const getOrderData = async (): Promise<Order | null> => {
  try {
    const data = await AsyncStorage.getItem(ORDER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Ошибка при получении заказа:', error);
    return null;
  }
};

export const removeCourierData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COURIER_DATA_KEY);
  } catch (error) {
    console.error('Ошибка при удалении данных курьера:', error);
    throw error;
  }
}; 

export const removeTokenData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_DATA_KEY);
  } catch (error) {
    console.error('Ошибка при удалении токена:', error);  
    throw error;
  }
};

export const removeNotificationTokenData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_TOKEN_DATA_KEY);
  } catch (error) {
    console.error('Ошибка при удалении токена:', error);
    throw error;
  }
};

export const removeOrderData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ORDER_DATA_KEY);
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error);  
    throw error;
  }
};

export const updateCourierData = async (data: CourierData): Promise<void> => {
  try {
    await AsyncStorage.setItem(COURIER_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при обновлении данных курьера:', error);
    throw error;
  }
};