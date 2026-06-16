import AsyncStorage from '@react-native-async-storage/async-storage';
import { CourierData, TokenData, NotificationTokenData, Order } from '../types/interfaces';

const COURIER_DATA_KEY = '@courier_data';
const TOKEN_DATA_KEY = '@token_data';
const NOTIFICATION_TOKEN_DATA_KEY = '@notification_token_data';
const ORDER_DATA_KEY = '@order_data';
const NEED_CALL_VISITED_ORDERS_KEY = '@need_call_visited_order_ids';

const parseStringArray = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

export const saveCourierData = async (data: CourierData): Promise<void> => {
  try {
    if (!data) {
      return;
    }
    await AsyncStorage.setItem(COURIER_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при сохранении данных курьера:', error);
    throw error;
  }
};

export const saveTokenData = async (data: TokenData): Promise<void> => {
  try {
    if (!data?.token) {
      return;
    }
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
    if (!data || data === 'undefined') {
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при получении данных курьера:', error);
    await AsyncStorage.removeItem(COURIER_DATA_KEY);
    return null;
  }
};

export const getTokenData = async (): Promise<TokenData | null> => {
  try {
    const data = await AsyncStorage.getItem(TOKEN_DATA_KEY);
    if (!data) {
      return null;
    }
    const parsed = JSON.parse(data) as TokenData;
    return parsed?.token ? parsed : null;
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

export const getNeedCallVisitedOrderIds = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(NEED_CALL_VISITED_ORDERS_KEY);
    return parseStringArray(data);
  } catch (error) {
    console.error('Ошибка при получении needCall заказов:', error);
    return [];
  }
};

export const hasNeedCallVisitedOrderId = async (orderId: string): Promise<boolean> => {
  if (!orderId) {
    return false;
  }
  const ids = await getNeedCallVisitedOrderIds();
  return ids.includes(orderId);
};

export const addNeedCallVisitedOrderId = async (orderId: string): Promise<void> => {
  try {
    if (!orderId) {
      return;
    }
    const ids = await getNeedCallVisitedOrderIds();
    if (ids.includes(orderId)) {
      return;
    }
    await AsyncStorage.setItem(
      NEED_CALL_VISITED_ORDERS_KEY,
      JSON.stringify([...ids, orderId]),
    );
  } catch (error) {
    console.error('Ошибка при сохранении needCall заказа:', error);
    throw error;
  }
};

export const removeNeedCallVisitedOrderId = async (orderId: string): Promise<void> => {
  try {
    if (!orderId) {
      return;
    }
    const ids = await getNeedCallVisitedOrderIds();
    await AsyncStorage.setItem(
      NEED_CALL_VISITED_ORDERS_KEY,
      JSON.stringify(ids.filter((id) => id !== orderId)),
    );
  } catch (error) {
    console.error('Ошибка при удалении needCall заказа:', error);
    throw error;
  }
};

export const updateCourierData = async (data: CourierData): Promise<void> => {
  try {
    if (!data) {
      return;
    }
    await AsyncStorage.setItem(COURIER_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Ошибка при обновлении данных курьера:', error);
    throw error;
  }
};