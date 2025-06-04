import React, { useCallback, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import OrderDetails from '../components/OrderDetails';
import OrderDetails from '@/components/OrderDetails';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiService } from '../api/services';
import { CourierData, Order } from '../types/interfaces';

const OrderStatus = () => {
    const router = useRouter();
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [courier, setCourier] = useState<CourierData | null>(null);

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


    const handleStepChange = async (newStep: string) => {
        if (courier?._id) {
            const res = await apiService.updateData(courier?._id, "order.step", newStep);
            if (res.success && orderDetails) {
                setOrderDetails({
                    ...orderDetails,
                    step: newStep
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

                    <View style={styles.routeContainer}>
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
                    <View style={styles.spacer} />
                </ScrollView>

                <View style={styles.footer}>
                    {orderDetails && <OrderDetails order={orderDetails} onStepChange={handleStepChange} />}
                </View>
            </View>
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
    }
});

export default OrderStatus;