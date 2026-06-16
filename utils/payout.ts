import { apiService } from "../api/services";
import { CourierData, OrderHistory } from "../types/interfaces";

export const formatHistoryDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const getPayoutRates = (price12?: number, price19?: number) => ({
    price12: price12 && price12 > 0 ? price12 : 300,
    price19: price19 && price19 > 0 ? price19 : 500,
});

export const calculateAvailablePayout = (
    orders: OrderHistory[],
    price12?: number,
    price19?: number,
) => {
    const rates = getPayoutRates(price12, price19);

    let bottleEarnings = 0;
    let faktSum = 0;

    for (const order of orders) {

        if (order.status !== "delivered") {
            continue;
        }

        const b12 = Number(order.products?.b12) || 0;
        const b19 = Number(order.products?.b19) || 0;

        if (order.opForm === "fakt") {
            faktSum += Number(order.sum) || 0;
            continue;
        }

        bottleEarnings += b12 * rates.price12 + b19 * rates.price19;
    }


    return Math.max(0, bottleEarnings - faktSum);
};

const fetchAvailableIncomeFromHistory = async (userData: CourierData) => {
    const createdAt = userData.createdAt ? new Date(userData.createdAt) : new Date("2024-01-01");
    const ordersRes = await apiService.getOrdersHistory(
        formatHistoryDate(createdAt),
        formatHistoryDate(new Date()),
    );

    if (!ordersRes?.success || !Array.isArray(ordersRes.orders)) {
        return 0;
    }

    return calculateAvailablePayout(
        ordersRes.orders,
        userData.price12,
        userData.price19,
    );
};

export const fetchAvailableIncome = async () => {
    const courierData = await apiService.getData();
    if (!courierData.success || !courierData.userData) {
        return 0;
    }

    // const incomeRes = await apiService.getAvailableIncome();
    // if (incomeRes?.success && incomeRes.availableIncome != null) {
    //     return Number(incomeRes.availableIncome) || 0;
    // }

    // console.log("incomeRes in fetchAvailableIncome = ", JSON.stringify(incomeRes, null, 2));

    return fetchAvailableIncomeFromHistory(courierData.userData);
};
