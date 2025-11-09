import { apiService } from "@/api/services";
import { Order } from "@/types/interfaces";
import { getCourierData } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Linking, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MyButton from "./MyButton";

interface OrderDetailsProps {
    order: Order;
    onStepChange?: (newStatus: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 80;  // Высота уведомления в свернутом состоянии
const EXPANDED_HEIGHT = 300;  // Высота уведомления в развернутом состоянии
const DRAG_HANDLE_HEIGHT = 40;

const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onStepChange }) => {
    const router = useRouter();

    const [isCollapsed, setIsCollapsed] = useState(true);
    const [checkedItems, setCheckedItems] = useState<boolean[]>(() => {
        const items = [];
        if (order.products.b12 > 0) {
            items.push(false);
        } else {
            items.push(true);
        }
        if (order.products.b19 > 0) {
            items.push(false);
        } else {
            items.push(true);
        }
        return items;
    });

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

    const expandNotification = () => {
        setIsCollapsed(false);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    };
    
    const collapseNotification = () => {
        setIsCollapsed(true);
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    };

    const toggleItemCheck = (index: number) => {
        const newCheckedItems = [...checkedItems];
        newCheckedItems[index] = !newCheckedItems[index];
        setCheckedItems(newCheckedItems);
    };

    const [orderTakenLoading, setOrderTakenLoading] = useState(false);
    const [completeOrderLoading, setCompleteOrderLoading] = useState(false);
    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);

    // Функция для разделения номеров телефона
    const getPhoneNumbers = (phoneString: string) => {
        if (!phoneString) return [];
        return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
    };

    const handleOrderTaken = async () => {
        setOrderTakenLoading(true);
        if (!checkedItems.includes(false)) {
            if (onStepChange) {
                await onStepChange('toClient');
            }
            // navigation.navigate('OrderStatus');
        }
        setOrderTakenLoading(false);
    };

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
        }).start();
    })  

    const completeOrder = async () => {
        setCompleteOrderLoading(true);
        const courier = await getCourierData();
        if (courier) {
            const res = await apiService.completeOrder(order.orderId, courier._id, order.products.b12, order.products.b19);
            if (res.success) {
                const income = res.income;
                router.push({
                    pathname: '/success' as any,
                    params: { formData: JSON.stringify(income) }
                });
                // await apiService.orTools();
            }
        }
        setCompleteOrderLoading(false);
    }
    
    return (
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
                    <View>
                        <Text style={styles.title}>
                            Детали заказа:
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.title}>
                            Детали заказа:
                        </Text>
                        {/* <View>
                            <Text style={styles.subTitle}>Клиент: {order.clientTitle}</Text>
                        </View> */}
                        <View>
                            <Text style={styles.subTitle}>Адрес: {order.clientAddress}</Text>
                        </View>
                        <View style={{ marginVertical: 8}}>
                            <MyButton
                                title={`Номер: ${order.clientPhone}`}
                                onPress={() => {
                                    if (order.clientPhone) {
                                        const phoneNumbers = getPhoneNumbers(order.clientPhone);
                                        if (phoneNumbers.length === 1) {
                                            // Если только один номер, сразу звоним
                                            Linking.openURL(`tel:${phoneNumbers[0]}`);
                                        } else {
                                            // Если несколько номеров, показываем модальное окно
                                            setIsPhoneModalVisible(true);
                                        }
                                    }
                                }}
                                variant="outlined"
                                width="full"
                            />
                        </View>
                        <View>
                            <Text style={styles.subTitle}>Комментарий: {order.comment}</Text>
                        </View>
                        <View style={styles.detailsContainer}>
                            {order.products.b12 > 0 && (
                                <View style={styles.itemRow}>
                                    <TouchableOpacity
                                        onPress={() => toggleItemCheck(0)} 
                                        disabled={order.step === 'toClient'}
                                        style={styles.itemTouchable}
                                    >
                                        <View style={styles.checkbox}>
                                            {(checkedItems[0] || order.step === 'toClient') && (
                                                <Image source={require('../assets/images/check.png')} style={{ width: 24, height: 24 }}/>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={styles.itemTitle}>Бутыль 12л</Text>
                                            <Text style={styles.itemDescription}>Количество: {order.products.b12}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {order.products.b19 > 0 && (
                                <View style={styles.itemRow}>
                                    <TouchableOpacity
                                        onPress={() => toggleItemCheck(1)} 
                                        disabled={order.step === 'toClient'}
                                        style={styles.itemTouchable}
                                    >
                                        <View style={styles.checkbox}>
                                            {(checkedItems[1] || order.step === 'toClient') && (
                                                <Image source={require('../assets/images/check.png')} style={{ width: 24, height: 24 }}/>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={styles.itemTitle}>Бутыль 19л</Text>
                                            <Text style={styles.itemDescription}>Количество: {order.products.b19}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* <TouchableOpacity
                            style={styles.helpSection}
                            onPress={() => {router.push("/changeOrderBottles")}}
                        >
                            <View style={styles.helpLeft}>
                                <Text style={styles.helpText}>
                                    Изменить количество бутылей?
                                </Text>
                            </View>

                            <View>
                                <Image source={require("../assets/images/arrowRight.png")} style={styles.arrowIcon} resizeMode='contain' />
                            </View>
                        </TouchableOpacity> */}

                        <View style={styles.buttonContainer}>
                            {order.step === 'toAquaMarket' ? (
                                <MyButton
                                    title="Заказ у меня"
                                    onPress={handleOrderTaken}
                                    variant="contained"
                                    width="full"
                                    disabled={checkedItems.includes(false)}
                                    loading={orderTakenLoading}
                                />
                            ) : (
                                <MyButton
                                    title="Отдать заказ"
                                    onPress={() => {
                                        router.push({
                                            pathname: '/changeOrderBottles' as any,
                                            params: { 
                                                formData: JSON.stringify({ 
                                                    orderId: order.orderId, 
                                                    income: order.income,
                                                    isFinish: true,
                                                    products: order.products
                                                }) 
                                            }
                                        });
                                    }}
                                    variant="contained"
                                    width="full"
                                    loading={completeOrderLoading}
                                />
                            )}
                            <TouchableOpacity
                                onPress={() => {
                                    router.push({
                                        pathname: '/cancelledReason' as any,
                                        params: { formData: JSON.stringify({ orderId: order.orderId, income: order.income }) }
                                    })
                                }}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Отменить заказ
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Модальное окно для выбора номера телефона */}
            <Modal
                visible={isPhoneModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPhoneModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Выберите номер телефона</Text>
                        {getPhoneNumbers(order.clientPhone || '').map((phone, index) => (
                            <View key={index} style={styles.phoneButton}>
                                <MyButton
                                    title={phone}
                                    onPress={() => {
                                        Linking.openURL(`tel:${phone}`);
                                        setIsPhoneModalVisible(false);
                                    }}
                                    variant="outlined"
                                    width="full"
                                />
                            </View>
                        ))}
                        <View style={styles.cancelButton}>
                            <MyButton
                                title="Отмена"
                                onPress={() => setIsPhoneModalVisible(false)}
                                variant="contained"
                                width="full"
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    )
}

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
        padding: 24
    },
    title: {
        fontSize: 24,
        fontWeight: '500',
        marginTop: -8
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '500'
    },
    detailsContainer: {
        marginTop: 16
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8
    },
    itemTouchable: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#E3E3E3',
        borderRadius: 6,
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    itemTitle: {
        fontSize: 18
    },
    itemDescription: {
        color: '#545454'
    },
    helpSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginTop: 4
    },
    helpLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    questionIcon: {
        width: 20,
        height: 20,
        marginTop: 4
    },
    helpText: {
        fontSize: 16,
        marginLeft: 16
    },
    arrowIcon: {
        width: 24,
        height: 24,
        marginLeft: 10
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
    disabledButton: {
        backgroundColor: '#F9C8C8'
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
    },
    phoneButton: {
        marginBottom: 12
    },
    cancelButton: {
        marginTop: 8
    }
});

export default OrderDetails;