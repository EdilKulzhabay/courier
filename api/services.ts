import { Order } from '../types/interfaces';
import api from './axios';

// Примеры API-сервисов
export const apiService = {
    getData: async () => {
        try {
            const response = await api.get('/getCourierAggregatorData');
            return response.data;
        } catch (error: any) {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                return { success: false, message: 'Нет доступа' };
            }
            throw error;
        }
    },

    sendCode: async (data: any) => {
        try {
            const response = await api.post('/courierAggregatorSendCode', data);
            return response.data;
        } catch (error) {
            throw error;    
        }
    },

    codeConfirm: async (data: any) => {
        try {
            const response = await api.post('/courierAggregatorCodeConfirm', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    registerCourier: async (data: any) => {
        try {
            const response = await api.post('/courierAggregatorRegister', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    loginCourier: async (data: any) => {
        try {
            const response = await api.post('/courierAggregatorLogin', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateData: async (id: string, changeField: any, changeData: any) => {
        try {
            const response = await api.post(`/updateCourierAggregatorData`, {id, changeField, changeData});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateCourierData: async (id: string, data: any) => {
        try {
            const response = await api.post(`/updateCourierAggregatorDataFull`, {id, data});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    acceptOrder: async (order: Order) => {
        try {
            const response = await api.post(`/acceptOrderCourierAggregator`, {order});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    completeOrder: async (orderId: string, courierId: string, b12: number, b19: number, emptyb12: number, emptyb19: number, opForm?: string) => {
        try {
            const response = await api.post(`/completeOrderCourierAggregator`, {orderId, courierId, b12, b19, emptyb12, emptyb19, opForm});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getOrdersHistory: async (startDate?: string, endDate?: string) => {
        try {
            const response = await api.post('/getCourierAggregatorOrdersHistory', {startDate, endDate});
            return response.data;
        } catch (error) {
            throw error;
        }
    },
    // DELETE запрос
    deleteData: async (id: string) => {
        try {
            const response = await api.delete(`/endpoint/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    cancelOrder: async (orderId: string, reason: string) => {
        try {
            const response = await api.post(`/cancelOrderCourierAggregator`, {orderId, reason});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getIncome: async () => {
        try {
            const response = await api.get('/getCourierAggregatorIncome');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getCashIncome: async () => {
        try {
            const response = await api.get('/getCourierAggregatorCashIncome');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getAvailableIncome: async () => {
        try {
            const response = await api.get('/getCourierAggregatorAvailableIncome');
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось получить доступный баланс';
            return { success: false, message };
        }
    },

    getDeliveredBottlesToday: async () => {
        try {
            const response = await api.get('/getCourierAggregatorDeliveredBottlesToday');
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось получить количество доставленных бутылей';
            return { success: false, message };
        }
    },

    orTools: async () => {
        try {
            const response = await api.get('/orTools');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    needToGiveTheOrderToCourier: async (fullName: string) => {
        try {
            const response = await api.post('/needToGiveTheOrderToCourier', {fullName});
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createOrderKaspiQr: async (orderId: string, amount?: number, forceRefresh = false) => {
        try {
            const response = await api.post('/createOrderKaspiQrCourierAggregator', {
                orderId,
                amount,
                forceRefresh,
            });
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось создать Kaspi QR';
            return { success: false, message };
        }
    },

    checkOrderKaspiQr: async (orderId: string) => {
        try {
            const response = await api.post('/checkOrderKaspiQrCourierAggregator', { orderId });
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось проверить оплату';
            return { success: false, message };
        }
    },

    requestWithdrawal: async (amount: number) => {
        try {
            const response = await api.post('/requestWithdrawalCourierAggregator', { amount });
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось отправить запрос на вывод';
            return { success: false, message };
        }
    },

    getOrder: async (orderId: string) => {
        try {
            const response = await api.post('/getOrderDataForId', { id: orderId });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    sendNotificationToClient: async (notificationToken: string, message: string) => {
        try {
            const response = await api.post('/sendNotificationToClient', { notificationToken, message });
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось отправить уведомление';
            return { success: false, message };
        }
    },

    deleteCourierAggregator: async (courierId: string) => {
        try {
            const response = await api.post('/deleteCourierAggregator', { courierId });
            return response.data;
        } catch (error: any) {
            const message =
                error?.response?.data?.message || 'Не удалось удалить аккаунт';
            return { success: false, message };
        }
    },
};