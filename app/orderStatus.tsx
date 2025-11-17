import React, { useCallback, useState } from 'react';
import { Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import OrderDetails from '../components/OrderDetails';
import MyButton from '@/components/MyButton';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiService } from '../api/services';
import { CourierData, Order } from '../types/interfaces';

const OrderStatus = () => {
    const router = useRouter();
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [courier, setCourier] = useState<CourierData | null>(null);
    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);

    // Функция для разделения номеров телефона
    const getPhoneNumbers = (phoneString: string) => {
        if (!phoneString) return [];
        return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
    };

    const fetchOrderData = async () => {
        const courierData = await apiService.getData();
        if (courierData.success) {
            setCourier(courierData.userData);
            if (courierData.userData.order.orderId) {
                setOrderDetails(courierData.userData.order)
            } else {
                setOrderDetails(null)
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchOrderData();
        }, [])
    );


    const handleStepChange = async () => {
        if (courier?._id) {
            const res = await apiService.updateData(courier?._id, "order.step", 'toClient');
            if (res.success && orderDetails) {
                setOrderDetails({
                    ...orderDetails,
                    step: "toClient"
                });
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Статус заказа</Text>
            </View>

            <View style={styles.content}>
                <ScrollView style={styles.scrollView}>
                    <View style={styles.summarySection}>
                        <Text style={styles.price}>
                            {orderDetails?.sum} ₸ 
                        </Text>
                        <Text style={styles.description}>
                            Ваш ожидаемый заработок за доставку
                        </Text>
                        <Text style={{fontSize: 16, fontWeight: '500', marginTop: 8}}>
                            Клиент: {orderDetails?.clientTitle}
                        </Text>
                        <Text style={{fontSize: 16, fontWeight: '500', marginTop: 8}}>
                            Количество бутылей:
                        </Text>
                        {orderDetails?.products?.b12 && orderDetails?.products?.b12 > 0 && <Text style={{fontSize: 16, fontWeight: '500', marginTop: 8}}>
                            12,5л: {orderDetails?.products?.b12} бутылей
                        </Text>}
                        {orderDetails?.products?.b19 && orderDetails?.products?.b19 > 0 && <Text style={{fontSize: 16, fontWeight: '500', marginTop: 8}}>
                            19,8л: {orderDetails?.products?.b19} бутылей
                        </Text>}
                        <Text style={{fontSize: 16, fontWeight: '500', marginTop: 8}}>
                            Форма оплаты: {orderDetails?.opForm === "fakt" ? "Нал/Карта/QR" : orderDetails?.opForm === "credit" ? "В долг" : orderDetails?.opForm === "coupon" ? "Талоны" : orderDetails?.opForm === "postpay" ? "Постоплата" : orderDetails?.opForm === "mixed" ? "Смешанная" : ""}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.mapLink}
                        onPress={() => {
                            if (orderDetails?.step === 'toAquaMarket') {
                                Linking.openURL(orderDetails.aquaMarketAddressLink || '');
                            } 
                            if (orderDetails?.step === 'toClient') {
                                Linking.openURL(orderDetails?.clientAddressLink || '');
                            }
                        }}
                    >
                        <View style={styles.mapLinkLeft}>
                            <Image source={require("../assets/images/map.png")} style={styles.mapIcon} resizeMode='contain' />
                            <Text style={styles.mapText}>
                                Посмотреть на карте
                            </Text>
                        </View>

                        <View style={styles.mapLinkRight}>
                            <Text style={styles.mapService}>2 GIS</Text>
                            <Image source={require("../assets/images/arrowRight.png")} style={styles.arrowIcon} resizeMode='contain' />
                        </View>
                    </TouchableOpacity>

                    {/* <View style={styles.routeContainer}>
                        <View style={styles.routeImageContainer}>
                            {orderDetails?.step === 'toAquaMarket' && <Image source={require("../assets/images/wayToAqua.png")} style={styles.routeImage} resizeMode='contain' />}
                            {orderDetails?.step === 'toClient' && <Image source={require("../assets/images/wayToClient.png")} style={styles.routeImage} resizeMode='contain' />}
                        </View>
                        <View style={styles.routeDetailsContainer}>
                            <View>
                                <Text style={styles.locationText}>
                                    Текущее местоположение
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.locationText}>
                                    {orderDetails?.aquaMarketAddress}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.locationText}>
                                    {orderDetails?.clientAddress}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.spacer} /> */}
                    <View style={{ marginTop: 8}}>
                        <Text style={styles.subTitle}>Адрес: {orderDetails?.clientAddress}</Text>
                    </View>
                    <View style={{ marginVertical: 8}}>
                        <MyButton
                            title={`Номер: ${orderDetails?.clientPhone}`}
                            onPress={() => {
                                if (orderDetails?.clientPhone) {
                                    const phoneNumbers = getPhoneNumbers(orderDetails?.clientPhone);
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
                        <Text style={styles.subTitle}>Комментарий: {orderDetails?.comment}</Text>
                    </View>
                    <View style={styles.buttonContainer}>
                        {orderDetails?.step === 'toAquaMarket' ? (
                            <MyButton
                                title="Заказ у меня"
                                onPress={handleStepChange}
                                variant="contained"
                                width="full"
                            />
                        ) : (
                            <MyButton
                                title="Отдать заказ"
                                onPress={() => {
                                    router.push({
                                        pathname: '/changeOrderBottles' as any,
                                        params: { 
                                            formData: JSON.stringify({ 
                                                orderId: orderDetails?.orderId, 
                                                income: orderDetails?.income,
                                                isFinish: true,
                                                products: orderDetails?.products
                                            }) 
                                        }
                                    });
                                }}
                                variant="contained"
                                width="full"
                            />
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                router.push({
                                    pathname: '/cancelledReason' as any,
                                    params: { formData: JSON.stringify({ orderId: orderDetails?.orderId, income: orderDetails?.income }) }
                                })
                            }}
                            style={styles.secondaryButton}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Отменить заказ
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* <View style={styles.footer}>
                    {orderDetails && <OrderDetails order={orderDetails} onStepChange={handleStepChange} />}
                </View> */}
                
            </View>

            <Modal
                visible={isPhoneModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPhoneModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Выберите номер телефона</Text>
                        {getPhoneNumbers(orderDetails?.clientPhone || '').map((phone, index) => (
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F6F6',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        marginBottom: 24,
        padding: 24
    },
    backButton: {
        padding: 8,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    backIcon: {
        width: 24,
        height: 24
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        marginLeft: 16,
        color: '#292D32'
    },
    content: {
        flex: 1
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24
    },
    summarySection: {
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E3E3E3'
    },
    price: {
        fontSize: 24,
        fontWeight: '500'
    },
    description: {
        color: '#545454',
        marginTop: 8
    },
    mapLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginTop: 8
    },
    mapLinkLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    mapIcon: {
        width: 24,
        height: 24
    },
    mapText: {
        fontSize: 16,
        marginLeft: 16
    },
    mapLinkRight: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    mapService: {
        fontSize: 16,
        color: '#ADADAD'
    },
    arrowIcon: {
        width: 24,
        height: 24,
        marginLeft: 10
    },
    routeContainer: {
        flexDirection: 'row',
        marginTop: 24
    },
    routeImageContainer: {
        alignItems: 'flex-start'
    },
    routeImage: {
        width: 40,
        height: 400,
        marginLeft: -10
    },
    routeDetailsContainer: {
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginLeft: 16,
        marginTop: -8
    },
    locationText: {
        fontSize: 20
    },
    spacer: {
        height: 80
    },
    footer: {
        marginTop: 'auto'
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

export default OrderStatus;