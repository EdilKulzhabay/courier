import { apiService } from '@/api/services';
import { Order } from '@/types/interfaces';
import { saveOrderData } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
export interface OrderNotificationProps {
    isVisible: boolean;      // Флаг видимости уведомления
    onAccept: () => void;    // Колбэк при принятии заказа
    onDecline: () => void;   // Колбэк при отказе от заказа
    onTimeout: () => void;   // Колбэк при истечении времени ожидания
    hideNotification: () => void;
    order: Order
    isAccepted?: boolean;    // Флаг принятия заказа
}

// Константы компонента
const NOTIFICATION_TIMEOUT = 20000; // 20 секунд на принятие решения
const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 80;  // Высота уведомления в свернутом состоянии
const EXPANDED_HEIGHT = 300;  // Высота уведомления в развернутом состоянии
const DRAG_HANDLE_HEIGHT = 40; // Высота области для перетаскивания

const OrderNotification: React.FC<OrderNotificationProps> = ({
    isVisible,
    onAccept,
    onDecline,
    onTimeout,
    order,
    isAccepted = false,
}) => {
    const router = useRouter();
    // Значение анимации для перемещения уведомления по вертикали
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    
    // Ссылка на таймер автоматического скрытия
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Состояние сворачивания
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Настройка обработчика жестов для свайпов
    const panResponder = useRef(
        PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
            // Активируем PanResponder только если нажатие в верхней части уведомления
            const { locationY } = evt.nativeEvent;
            return locationY < DRAG_HANDLE_HEIGHT;
        },
        onMoveShouldSetPanResponder: (evt) => {
            // Активируем PanResponder только если движение началось в верхней части
            const { locationY } = evt.nativeEvent;
            return locationY < DRAG_HANDLE_HEIGHT;
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 50) {
            collapseNotification();
            } else {
            expandNotification();
            }
        },
        })
    ).current;

  // Эффект для управления видимостью и таймером
    useEffect(() => {
        if (isVisible) {
        expandNotification(); // Показываем уведомление

        if (!isAccepted) {
            // Устанавливаем таймер на автоматическое скрытие
            timeoutRef.current = setTimeout(() => {
            hideNotification();
            onTimeout();
            }, NOTIFICATION_TIMEOUT);
        }
        } else {
        hideNotification(); // Скрываем уведомление
        }

        // Очистка таймера при размонтировании
        return () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        };
    }, [isVisible, isAccepted]);

  // Функция для разворачивания уведомления
    const expandNotification = () => {
        setIsCollapsed(false);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    };

    // Функция для сворачивания уведомления
    const collapseNotification = () => {
        setIsCollapsed(true);
        Animated.spring(translateY, {
            toValue: 5,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    };

    // Функция для скрытия уведомления
    const hideNotification = () => {
        Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    };

    // Обработчик принятия заказа
    const handleAccept = async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        const res = await apiService.acceptOrder(order);
        await saveOrderData(order);
        if (res.success) {
            onAccept();
        }
    };

  // Обработчик отказа от заказа
    const handleDecline = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        onDecline();
        hideNotification();
    };

    // Не рендерим ничего, если уведомление не должно быть видимым
    if (!isVisible) return null;

    const handleHideNotification = async () => {
        router.push("../orderStatus");
        hideNotification();
    }

    return (
        <>
        
        {/* Контейнер уведомления */}
        <Animated.View
            style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            transform: [{ translateY }],
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: -2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            minHeight: isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
            }}
        >
            {/* Область для перетаскивания */}
            <View {...panResponder.panHandlers} style={{ height: DRAG_HANDLE_HEIGHT }}>
                <View style={styles.dragHandle} />
            </View>
            
            <View style={styles.content}>
                {isCollapsed ? (
                    // Свернутое состояние уведомления
                    <View style={styles.collapsedContent}>
                        <View>
                            <Text style={styles.orderTitle}>Новый заказ #{order.orderId}</Text>
                            <Text style={styles.orderSum}>{order.income} ₸</Text>
                        </View>
                        <TouchableOpacity onPress={expandNotification}>
                            <Text style={styles.expandButton}>Развернуть</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Развернутое состояние уведомления
                    <>
                        {/* Сумма заказа */}
                        <Text style={styles.expandedSum}>
                            {order.income} ₸
                        </Text>
                        <Text style={styles.sumDescription}>
                            Ваш ожидаемый заработок за доставку
                        </Text>

                        {/* Адреса доставки */}
                        <View style={styles.addressContainer}>
                            <View style={styles.addressRow}>
                                <View style={styles.startPoint} />
                                <View style={styles.addressDetails}>
                                    <Text style={styles.addressLabel}>От куда:</Text>
                                    <Text style={styles.addressValue}>{order.aquaMarketAddress}</Text>
                                </View>
                            </View>

                            <View style={styles.routeLine} />

                            <View style={styles.addressRow}>
                                <View style={styles.endPoint} />
                                <View style={styles.addressDetails}>
                                    <Text style={styles.addressLabel}>Куда:</Text>
                                    <Text style={styles.addressValue}>{order.clientAddress}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Кнопки действий */}
                        <View style={styles.buttonContainer}>
                            {isAccepted ? (
                                // Кнопка перехода к статусу заказа после принятия
                                <TouchableOpacity
                                    onPress={handleHideNotification}
                                    style={styles.primaryButton}
                                >
                                    <Text style={styles.buttonText}>
                                        Статус заказа
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                            // Кнопки принятия/отказа от заказа
                                <>
                                    <TouchableOpacity
                                        onPress={handleAccept}
                                        style={styles.primaryButton}
                                    >
                                        <Text style={styles.buttonText}>
                                            Принять
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleDecline}
                                        style={styles.secondaryButton}
                                    >
                                        <Text style={styles.secondaryButtonText}>
                                            Отказаться
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </>
                )}
            </View>
        </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    dragHandle: {
        width: 48,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 100,
        alignSelf: 'center',
        marginTop: 16
    },
    content: {
        padding: 20
    },
    collapsedContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: '500'
    },
    orderSum: {
        color: '#707070'
    },
    expandButton: {
        color: '#DC1818'
    },
    expandedSum: {
        fontSize: 24,
        fontWeight: '500'
    },
    sumDescription: {
        color: '#707070',
        marginTop: 8
    },
    addressContainer: {
        marginTop: 24
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start'
    },
    startPoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DC1818',
        marginTop: 8
    },
    endPoint: {
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DC1818',
        marginTop: 8
    },
    routeLine: {
        height: 16,
        width: 2,
        backgroundColor: '#e0e0e0',
        marginLeft: 3
    },
    addressDetails: {
        marginLeft: 16
    },
    addressLabel: {
        color: '#707070'
    },
    addressValue: {
        color: 'black',
        fontSize: 18,
        marginTop: 4
    },
    buttonContainer: {
        marginTop: 24,
        gap: 12
    },
    primaryButton: {
        backgroundColor: '#DC1818',
        borderRadius: 12,
        paddingVertical: 16
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '500'
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: '#DC1818',
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 12
    },
    secondaryButtonText: {
        color: '#DC1818',
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '500'
    }
});

export default OrderNotification; 