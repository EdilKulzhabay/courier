import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import OrderDetails from '../components/OrderDetails';
import MyButton from '@/components/MyButton';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiService } from '../api/services';
import { CourierData, Order } from '../types/interfaces';
import { addNeedCallVisitedOrderId, hasNeedCallVisitedOrderId } from '../utils/storage';

const API_ORIGIN = "https://api.tibetskayacrm.kz";

const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};

const OrderStatus = () => {
    const router = useRouter();
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [courier, setCourier] = useState<CourierData | null>(null);
    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
    const [orderId, setOrderId] = useState<string>("");
    const [currentPhone, setCurrentPhone] = useState<string[]>([]);
    const [addressImages, setAddressImages] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [communicationMethod, setCommunicationMethod] = useState<string>("phone");

    // Функция для разделения номеров телефона
    const getPhoneNumbers = (phoneString: string) => {
        if (!phoneString) return [];
        return phoneString.split(',').map(phone => phone.trim()).filter(phone => phone.length > 0);
    };

    // Функция для нормализации номера телефона для WhatsApp
    const normalizePhoneForWhatsApp = (phone: string): string => {
        // Убираем все пробелы, дефисы, скобки и другие символы форматирования
        let normalized = phone.replace(/[\s\-\(\)]/g, '');
        
        // Если начинается с +7, убираем +
        if (normalized.startsWith('+7')) {
            normalized = normalized.substring(1);
        }
        // Если начинается с 8, заменяем на 7
        else if (normalized.startsWith('8')) {
            normalized = '7' + normalized.substring(1);
        }
        // Если начинается с 7, оставляем как есть
        
        return normalized;
    };

    const fetchOrderData = async () => {
        if (!orderId) {
            return;
        }
        const orderData = await apiService.getOrder(orderId);
        const currentAddress = orderData.order.client.addresses.find((address: any) => address.name === orderData.order.address.name);
        const phones = getPhoneNumbers(currentAddress?.phone ?? orderData.order.address.phone ?? "");
        const details = { ...orderData.order, step: "toClient" as const };

        setCurrentPhone(phones);
        setAddressImages(Array.isArray(currentAddress?.images) ? currentAddress.images : []);
        setOrderDetails(details);

        if (details.needCall && details._id) {
            const alreadyVisited = await hasNeedCallVisitedOrderId(details._id);
            if (!alreadyVisited) {
                await addNeedCallVisitedOrderId(details._id);
                router.push({
                    pathname: '/orderChat' as any,
                    params: {
                        orderId: details._id,
                        clientTitle: details.client?.fullName ?? '',
                        currentPhone: JSON.stringify(phones),
                    },
                });
            }
        }
    };

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        if (courierData.success) {
            setCourier(courierData.userData);
            if (courierData.userData.order.orderId) {
                setOrderId(courierData.userData.order.orderId);
            } else {
                setOrderDetails(null)
            }
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrderData();
        }
    }, [orderId]);

    useFocusEffect(
        useCallback(() => {
            fetchCourierData();
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

    if (!orderDetails) {
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
                    <Text style={{textAlign: 'center', marginTop: 20}}>Загрузка данных...</Text>
                </View>
            </View>
        );
    }

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

                    <View style={{backgroundColor: '#f9f9fb', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <View style={{backgroundColor: "#FEF2F2", borderRadius: 100, padding: 8}}>
                                <Image source={require("../assets/images/dollar.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                            </View>
                            <View>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#6A7282'}}>Ваш заработок</Text>
                                <Text style={{fontSize: 14, fontWeight: '500'}}>
                                    {orderDetails.products.b12 * (courier?.price12 || 0) + orderDetails.products.b19 * (courier?.price19 || 0)} ₸
                                </Text>
                            </View>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <View>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#6A7282'}}>Форма оплаты</Text>
                                <Text style={{fontSize: 14, fontWeight: '500'}}>
                                    {orderDetails?.opForm === "fakt" ? "Нал/Карта/QR" : orderDetails?.opForm === "credit" ? "Карта" : orderDetails?.opForm === "coupon" ? "Талоны" : orderDetails?.opForm === "postpay" ? "Постоплата" : orderDetails?.opForm === "mixed" ? "Смешанная" : orderDetails?.opForm === "qr" ? "QR" : ""}
                                </Text>
                            </View>
                            <View style={{backgroundColor: "#FEF2F2", borderRadius: 100, padding: 8}}>
                                {orderDetails?.opForm === "fakt" ? (
                                    <Image source={require("../assets/images/cash.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                ) : orderDetails?.opForm === "credit" ? (
                                    <Image source={require("../assets/images/card.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                ) : orderDetails?.opForm === "coupon" ? (
                                    <Image source={require("../assets/images/coupon.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                ) : orderDetails?.opForm === "postpay" ? (
                                    <Image source={require("../assets/images/card.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                ) : orderDetails?.opForm === "qr" ? (
                                    <Image source={require("../assets/images/card.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                ) : ""}
                            </View>
                            
                        </View>

                    </View>

                    <View style={styles.section}>
                        <Text style={{fontSize: 16, fontWeight: '500', color: '#7d7d7f'}}>
                            Доставка воды
                        </Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                <Image source={require("../assets/images/fullBottle.png")} style={{width: 45, height: 72}} resizeMode='contain' />
                                <View>
                                    {orderDetails?.products?.b12 > 0 && 
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 16, fontWeight: '700'}}>x {orderDetails?.products?.b12 ?? 0}</Text>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: "#7d7d7f"}}>(12,5)</Text>
                                        </View>
                                    } 
                                    {orderDetails?.products?.b19 > 0 && 
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 16, fontWeight: '700'}}>x {orderDetails?.products?.b19 ?? 0}</Text>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: "#7d7d7f"}}>(18,9)</Text>
                                        </View>
                                    } 
                                    <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>Доставить</Text>
                                </View>
                            </View>
                            <View style={{width: 1, height: 80, backgroundColor: '#E3E3E3'}} />
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                <Image source={require("../assets/images/emptyBottle.png")} style={{width: 45, height: 72}} resizeMode='contain' />
                                <View>
                                    {orderDetails?.products?.b12 > 0 && 
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 16, fontWeight: '700'}}>x {orderDetails?.products?.b12 ?? 0}</Text>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: "#7d7d7f"}}>(12,5)</Text>
                                        </View>
                                    } 
                                    {orderDetails?.products?.b19 > 0 && 
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 16, fontWeight: '700'}}>x {orderDetails?.products?.b19 ?? 0}</Text>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: "#7d7d7f"}}>(18,9)</Text>
                                        </View>
                                    } 
                                    <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>Пустых забрать</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.section, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}>
                        <View style={{width: '50%'}}>
                            <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>Клиент</Text>
                            <Text style={{fontSize: 14, fontWeight: '500', color: '#000', marginTop: 4}}>{orderDetails?.client?.fullName ?? ''}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => {
                                if (currentPhone.length === 1) {
                                    Linking.openURL(`tel:${currentPhone[0]}`);
                                }
                                if (currentPhone.length > 1) {
                                    setCommunicationMethod("phone");
                                    setIsPhoneModalVisible(true);
                                }
                                if (currentPhone.length === 0) {
                                    Alert.alert('Ошибка', 'У клиента нет номеров телефона');
                                }
                            }}
                            style={{padding: 16, backgroundColor: '#f9f9fb', borderRadius: 100, alignItems: 'center', justifyContent: 'center'}}>
                            <Image source={require("../assets/images/call.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => {
                                if (currentPhone.length === 1) {
                                    const normalizedPhone = normalizePhoneForWhatsApp(currentPhone[0]);
                                    Linking.openURL(`https://wa.me/${normalizedPhone}`);
                                }
                                if (currentPhone.length > 1) {
                                    setCommunicationMethod("whatsapp");
                                    setIsPhoneModalVisible(true);
                                }
                                if (currentPhone.length === 0) {
                                    Alert.alert('Ошибка', 'У клиента нет номеров телефона');
                                }
                            }}
                            style={{padding: 16, backgroundColor: '#f9f9fb', borderRadius: 100, alignItems: 'center', justifyContent: 'center'}}>
                            <Image source={require("../assets/images/whatsapp.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            Linking.openURL(orderDetails?.address?.link || '');
                        }}
                        style={[styles.section, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}
                    >
                        <View style={{flexDirection: 'row', alignItems: 'center', width: '80%'}}>
                            <Image source={require("../assets/images/location.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                            <View style={{marginLeft: 8}}>
                                <Text style={{fontSize: 14, fontWeight: '400', color: '#000'}}>Адрес доставки</Text>
                                <Text style={{fontSize: 16, fontWeight: '500', color: '#292D32', marginTop: 4, marginLeft: 4}}>{orderDetails?.address?.actual ?? ''}</Text>
                            </View>
                        </View>
                        <Image source={require("../assets/images/arrowRight.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                    </TouchableOpacity>

                    {addressImages.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                router.push({
                                    pathname: '/addressImages' as any,
                                    params: {
                                        addressName: orderDetails?.address?.actual ?? '',
                                        images: JSON.stringify(addressImages),
                                    },
                                });
                            }} 
                            style={styles.section}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Image source={require("../assets/images/location.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                <Text style={{fontSize: 12, fontWeight: '500', color: '#000', marginLeft: 8}}>Как найти вход</Text>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f', marginLeft: 4}}>({addressImages.length} фото)</Text>
                            </View>
                            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginLeft: -8, marginRight: -8, paddingHorizontal: 8 }}>
                                {addressImages.map((imgUrl, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={{
                                            marginRight: 10,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                            borderWidth: 1,
                                            borderColor: '#E5E5EA',
                                            backgroundColor: '#fafbfc',
                                        }}
                                        onPress={() => setSelectedImage(getImageUrl(imgUrl))}
                                    >
                                        <Image
                                            source={{ uri: getImageUrl(imgUrl) }}
                                            style={{ width: 85, height: 85, borderRadius: 8 }}
                                            resizeMode='cover'
                                        />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </TouchableOpacity>
                    )}

                    {orderDetails.needCall && (
                        <View style={styles.section}>
                            <Text style={{fontSize: 16, fontWeight: '500', color: '#000'}}>Предварительно позвонить</Text>
                        </View>
                    )}

                    {orderDetails?.comment && (
                        <View style={[styles.section, {flexDirection: 'row', alignItems: 'flex-start'}]}>
                            <Image source={require("../assets/images/comments.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                            <View style={{marginLeft: 8}}>
                                <Text style={{fontSize: 14, fontWeight: '500', color: '#7d7d7f'}}>Комментарий</Text>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#292D32', marginTop: 4, marginLeft: 4}}>{orderDetails?.comment ?? ''}</Text>
                            </View>
                        </View>
                    )}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={() => {
                                router.push({
                                    pathname: '/orderChat' as any,
                                    params: { orderId: orderDetails._id, clientTitle: orderDetails.client?.fullName ?? '', currentPhone: JSON.stringify(currentPhone) }
                                });
                            }}
                            style={{
                                backgroundColor: '#3da163',
                                padding: 16,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexDirection: 'row',
                                marginBottom: 12,
                            }}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Image source={require("../assets/images/whiteComments.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                <View style={{marginLeft: 8}}>
                                    <Text style={{fontSize: 12, fontWeight: '500', color: '#fff'}}>Чат с клиентом</Text>
                                    <Text style={{fontSize: 12, fontWeight: '400', color: '#fff'}}>Переписка в реальном времени</Text>
                                </View>
                            </View>
                            <Image source={require("../assets/images/whiteChevronRight.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                        </TouchableOpacity>
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
                                        pathname: '/orderCompletion' as any,
                                        params: { 
                                            formData: JSON.stringify({ 
                                                orderId: orderDetails?._id,
                                                products: orderDetails?.products,
                                                opForm: orderDetails?.opForm,
                                                price12: orderDetails?.client?.price12,
                                                price19: orderDetails?.client?.price19,
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
                                if (courier) {
                                    router.push({
                                        pathname: '/cancelledReason' as any,
                                        params: { formData: JSON.stringify({ orderId: orderDetails?._id, income: orderDetails?.products.b12 * (courier.price12 || 0) + orderDetails?.products?.b19 * (courier?.price19 || 0) }) }
                                    })
                                } else {
                                    console.log("error in cancelled order, courier = ", courier)
                                }
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
                        {currentPhone.map((phone, index) => (
                            <View key={index} style={styles.phoneNumberContainer}>
                                <MyButton
                                    title={phone}
                                    onPress={() => {
                                        if (communicationMethod === "phone") {
                                            Linking.openURL(`tel:${phone}`);
                                        }
                                        if (communicationMethod === "whatsapp") {
                                            const normalizedPhone = normalizePhoneForWhatsApp(phone);
                                            Linking.openURL(`https://wa.me/${normalizedPhone}`);
                                        }
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
                                variant="outlined"
                                width="full"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <Pressable style={styles.fullImageOverlay} onPress={() => setSelectedImage(null)}>
                    {selectedImage ? (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    ) : null}
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    section: {
        marginTop: 12,
        borderWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E3E3E3',
        padding: 12,
        borderRadius: 8
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
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
        paddingHorizontal: 24,
        paddingBottom: 50,
    },
    summarySection: {
        marginTop: 12,
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
        marginTop: 12,
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
    phoneNumberContainer: {
        marginBottom: 20
    },
    phoneNumberLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'center',
        color: '#333'
    },
    phoneActionsRow: {
        flexDirection: 'row',
        gap: 12
    },
    phoneActionButton: {
    },
    cancelButton: {
        marginTop: 8
    },
    kaspiModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    kaspiAmount: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    kaspiQrImage: {
        width: 260,
        height: 260,
        marginBottom: 16,
    },
    kaspiLoader: {
        marginVertical: 32,
    },
    kaspiHint: {
        fontSize: 14,
        color: '#545454',
        textAlign: 'center',
        marginBottom: 16,
    },
    fullImageOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
});

export default OrderStatus;