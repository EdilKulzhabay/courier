import { apiService } from "@/api/services";
import { OrderHistory } from "@/types/interfaces";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
// Интерфейс для диапазона дат
interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

const screenWidth = Dimensions.get('window').width
const chartHeight = 230; // Фиксированная высота графика
const padding = 30;

interface GroupedOrders {
    [key: string]: OrderHistory[];
}

const DeliveredBottles = () => {
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const [deliveredBottlesKol, setDeliveredBottlesKol] = useState(0)
    const [weekData, setWeekData] = useState<number[]>([]);

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [range, setRange] = useState<DateRange>({
        startDate: sevenDaysAgo,
        endDate: today,
    });
    const [isCalendarVisible, setCalendarVisible] = useState<boolean>(false);

    const fetchOrders = async () => {
        if (!range.startDate || !range.endDate) return;
        
        setLoading(true);
        try {
            const response = await apiService.getOrdersHistory(
                formatDate(range.startDate),
                formatDate(range.endDate)
            );
            if (response.success) {
                let deliveredBottles = response.orders.reduce((acc: number, order: OrderHistory) => {
                    if (order.status !== "delivered") {
                        return acc;
                    }
                    return acc + (order.products.b12 + order.products.b19)
                }, 0)
                setDeliveredBottlesKol(deliveredBottles)

                // Группируем данные по дням для графика
                const dailyData = response.orders.reduce((acc: { [key: string]: number }, order: OrderHistory) => {
                    // Получаем дату заказа

                    if (order.status !== "delivered") {
                        return acc;
                    }

                    const orderDate = new Date(order.date.d);
                    const dateStr = orderDate.toISOString().split('T')[0];

                    // Заполняем все даты от startDate до endDate
                    const startDate = range.startDate!;
                    const endDate = range.endDate!;
                    const currentDate = new Date(startDate);

                    while (currentDate <= endDate) {
                        const currentDateStr = currentDate.toISOString().split('T')[0];
                        if (!acc[currentDateStr]) {
                            acc[currentDateStr] = 0;
                        }
                        
                        // Если текущая дата совпадает с датой заказа, добавляем количество бутылей
                        if (currentDateStr === dateStr) {
                            acc[currentDateStr] += (order.products.b12 + order.products.b19);
                        }
                        
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    return acc;
                }, {});

                const sortedDates = Object.keys(dailyData).sort();
                const graphData = sortedDates.map(date => dailyData[date]);
                setWeekData(graphData);
            }
        } catch (error) {
            console.error('Ошибка при получении заказов:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [range.startDate, range.endDate]);

    const formatDate = (date: Date | null): string => {
        if (!date) return "";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // +1, так как месяцы начинаются с 0
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const onDayPress = (day: any) => {
        if (!range.startDate || (range.startDate && range.endDate)) {
            setRange({ startDate: new Date(day.timestamp), endDate: null });
        } else if (range.startDate && !range.endDate) {
            const selectedDate = new Date(day.timestamp);
            if (selectedDate > range.startDate) {
                const newRange = { ...range, endDate: selectedDate };
                setRange(newRange);
                setCalendarVisible(false); // Закрываем календарь
            } else {
                setRange({ startDate: selectedDate, endDate: null });
            }
        }
    };

    // Настройка markedDates для выделения только начальной и конечной даты
    const markedDates: { [key: string]: any } = {};
    if (range.startDate) {
        markedDates[range.startDate.toISOString().split("T")[0]] = {
            selected: true,
            selectedColor: "#2AA65C",
        };
    }
    if (range.endDate) {
        markedDates[range.endDate.toISOString().split("T")[0]] = {
            selected: true,
            selectedColor: "#2AA65C",
        };
    }

    return (
        <View style={styles.container}>
        {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Доставлено бутылей
                </Text>
            </View>

            {/* Основной контент */}
            <View style={styles.content}>
                {/* Кнопка для открытия календаря */}
                <TouchableOpacity
                    onPress={() => setCalendarVisible(true)}
                    style={styles.calendarButton}
                >

                    <View style={styles.rowCenter}>
                        <Image 
                            source={require("../assets/images/calendar.png")}
                            style={styles.icon}
                            resizeMode="contain"
                        />
                        <Text style={styles.dateText}>
                            {range.startDate && range.endDate
                                ? `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`
                                : "Выберите диапазон дат"}
                        </Text>
                    </View>

                    <Image
                        source={require("../assets/images/setting.png")}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <View style={styles.bottlesCountContainer}>
                    <Text style={styles.bottlesCount}>{deliveredBottlesKol}</Text>
                    <Text style={styles.bottlesLabel}>всего доставлено</Text>
                </View>

                <View style={styles.chartContainer}>
                    {weekData.map((item: number, index: number) => {
                        const barWidth = (screenWidth - 48 - padding) / weekData.length; // Ширина каждого столбца
                        const barHeight = (item / 15) * chartHeight; // Высота столбца пропорционально максимуму

                        return (
                            <View key={index}>
                                <View
                                    style={[
                                        styles.barBackground,
                                        {
                                            width: barWidth,
                                            height: chartHeight,
                                            marginLeft: index !== 0 ? padding / weekData.length : 0,
                                        }
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.bar,
                                            {height: barHeight}
                                        ]}
                                    />
                                </View>
                                <Text style={styles.dayText}>{Number(range.startDate?.getDate()) + index}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <Modal
                visible={isCalendarVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCalendarVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Calendar
                            onDayPress={onDayPress}
                            markedDates={markedDates}
                        />
                        <Button title="Закрыть" onPress={() => setCalendarVisible(false)} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F7F7",
        paddingTop: 38
    },
    header: {
        flexDirection: "row",
        backgroundColor: "white", 
        alignItems: "center", 
        marginBottom: 24,
        padding: 24
    },
    backButton: {
        padding: 8,
        backgroundColor: "#EFEFEF",
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center"
    },
    icon: {
        width: 24,
        height: 24
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "500",
        marginLeft: 16,
        color: "#292D32"
    },
    content: {
        marginTop: 16,
        paddingHorizontal: 24
    },
    calendarButton: {
        backgroundColor: "white",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 20,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    rowCenter: {
        flexDirection: "row",
        alignItems: "center"
    },
    dateText: {
        marginLeft: 12,
        fontWeight: "500"
    },
    bottlesCountContainer: {
        marginTop: 24,
        alignItems: "center"
    },
    bottlesCount: {
        fontSize: 42,
        fontWeight: "bold"
    },
    bottlesLabel: {
        fontWeight: "500"
    },
    chartContainer: {
        marginTop: 28,
        flexDirection: "row",
        height: chartHeight
    },
    barBackground: {
        backgroundColor: "#E9ECF1",
        justifyContent: "flex-end",
        borderRadius: 4
    },
    bar: {
        width: "100%",
        backgroundColor: "#DC1818",
        borderRadius: 4
    },
    dayText: {
        textAlign: "center",
        fontSize: 14
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)"
    },
    modalContent: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        width: "91.7%"
    }
});

export default DeliveredBottles;
