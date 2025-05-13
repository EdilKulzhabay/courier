import { apiService } from "@/api/services";
import { OrderHistory } from "@/types/interfaces";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";

interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface GroupedOrders {
    [key: string]: OrderHistory[];
}

const History = () => {
    const router = useRouter()
    const [groupedOrders, setGroupedOrders] = useState<GroupedOrders>({});
    const [loading, setLoading] = useState(false);

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [range, setRange] = useState<DateRange>({
        startDate: sevenDaysAgo,
        endDate: today,
    });
    const [isCalendarVisible, setCalendarVisible] = useState<boolean>(false);

    const groupOrdersByDate = (orders: OrderHistory[]) => {
        const sortedOrders = [...orders].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const grouped: GroupedOrders = {};
        sortedOrders.forEach(order => {
            const date = new Date(order.date.d);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey = '';
            
            if (date.toDateString() === today.toDateString()) {
                dateKey = 'Сегодня';
            } else if (date.toDateString() === yesterday.toDateString()) {
                dateKey = 'Вчера';
            } else {
                dateKey = date.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long'
                });
            }

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        });

        // Создаем отсортированный объект с правильным порядком ключей
        const orderedGroups: GroupedOrders = {};
        
        // Сначала добавляем "Сегодня" если есть
        if (grouped['Сегодня']) {
            orderedGroups['Сегодня'] = grouped['Сегодня'];
        }
        
        // Затем "Вчера" если есть
        if (grouped['Вчера']) {
            orderedGroups['Вчера'] = grouped['Вчера'];
        }
        
        // Получаем остальные даты и сортируем их в порядке убывания
        const otherDates = Object.keys(grouped)
            .filter(key => key !== 'Сегодня' && key !== 'Вчера')
            .sort((a, b) => {
                const dateA = new Date(a.split(' ')[0] + ' ' + a.split(' ')[1]);
                const dateB = new Date(b.split(' ')[0] + ' ' + b.split(' ')[1]);
                return dateB.getTime() - dateA.getTime();
            });
        
        // Добавляем остальные даты в отсортированном порядке
        otherDates.forEach(date => {
            orderedGroups[date] = grouped[date];
        });

        return orderedGroups;
    };

    const fetchOrders = async () => {
        if (!range.startDate || !range.endDate) return;
        
        setLoading(true);
        try {
            const response = await apiService.getOrdersHistory(
                formatDate(range.startDate),
                formatDate(range.endDate)
            );
            if (response.success) {
                setGroupedOrders(groupOrdersByDate(response.orders));
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

    return <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Image
                    source={require("../assets/images/arrowBack.png")}
                    style={styles.icon}
                    resizeMode="contain"
                />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>История заказов</Text>
        </View>

        <View style={styles.filterContainer}>
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
        </View>

        <ScrollView style={styles.scrollContent}>
            {loading ? (
                <Text style={styles.loadingText}>Загрузка...</Text>
            ) : (
                Object.entries(groupedOrders).map(([date, dateOrders], index) => (
                    <View key={index} style={styles.dateGroup}>
                        <Text style={styles.dateTitle}>{date}</Text>
                        {dateOrders.map((order) => {
                            console.log("order = ", order);
                            return (
                                <View key={order._id} style={styles.orderCard}>
                                    <View style={styles.orderHeader}>
                                        <View style={styles.rowCenter}>
                                            <Text style={styles.priceText}>{order.income} ₸</Text>
                                        </View>
                                        <Text style={styles.detailsButton} onPress={() => {
                                            router.push({
                                                pathname: "/orderHistoryData" as any,
                                                params: { order: JSON.stringify(order) }
                                            })
                                        }}>подробнее</Text>
                                    </View>
            
                                    <Text style={styles.addressLabel}>адрес:</Text>
                                    <Text style={styles.addressText}>{order.address.actual}</Text>
                                </View>
                            )
                        })}
                    </View>
                ))
            )}
        </ScrollView>

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
}

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
    filterContainer: {
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
    scrollContent: {
        flex: 1,
        paddingHorizontal: 24,
        marginTop: 16
    },
    loadingText: {
        textAlign: "center",
        paddingVertical: 16
    },
    dateGroup: {
        marginBottom: 24
    },
    dateTitle: {
        fontSize: 20,
        fontWeight: "500",
        marginBottom: 16
    },
    orderCard: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    orderHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0"
    },
    priceText: {
        fontSize: 18,
        fontWeight: "500"
    },
    detailsButton: {
        color: "#DC1818"
    },
    addressLabel: {
        color: "#6c6c6c",
        marginTop: 12
    },
    addressText: {
        color: "#333"
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

export default History