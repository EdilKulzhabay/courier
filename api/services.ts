import api from './axios';
import { Order, FinanceType } from '../types/interfaces';

// Примеры API-сервисов
export const apiService = {
    getData: async () => {
        try {
            const response = await api.get('/getCourierAggregatorData');
            return response.data;
        } catch (error) {
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

    completeOrder: async (orderId: string, courierId: string, b12: number, b19: number) => {
        try {
            const response = await api.post(`/completeOrderCourierAggregator`, {orderId, courierId, b12, b19});
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
    }
};