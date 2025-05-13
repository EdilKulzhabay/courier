import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiService } from "../api/services";
import MyButton from "../components/MyButton";
import MySwitchToggle from "../components/MySwitchToggle";
import { CourierData, Order } from "../types/interfaces";
import { updateCourierData } from "../utils/storage";

const Main = () => {
    const router = useRouter();
    const [courier, setCourier] = useState<CourierData | null>(null);
    const [order, setOrder] = useState<Order | null>(null);

    const [inActiveModal, setInActiveModal] = useState(false);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        await updateCourierData(courierData.userData);
        if (courierData.success) {
            setCourier(courierData.userData);
            if (courierData.userData.order.orderId) {
                setOrder(courierData.userData.order)
            } else {
                setOrder(null)
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCourierData();
        }, [])
    );

    const changeOnTheLine = async () => {
        const courierData = await apiService.getData();
        const orderData = courierData.userData.order;
        
        if (courierData?.userData?._id && !orderData?.orderId) {
            const res = await apiService.updateData(courierData?.userData?._id, "onTheLine", !courierData?.userData?.onTheLine);
            if (res.success) {
                setCourier({...courierData?.userData, onTheLine: !courierData?.userData?.onTheLine});
            }
        } else {
            alert("Вы не можете изменить статус, пока не выполните существующий заказ")
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image source={require("../assets/images/smallLogo.png")} style={{width: 129, height: 48}} resizeMode="contain" />
                <TouchableOpacity onPress={() => {router.push("./settings")}}>
                <Image
                    source={require("../assets/images/profile.png")}
                    style={{width: 30, height: 30}}
                    resizeMode="contain"
                />
                </TouchableOpacity>
            </View>


            <View style={styles.profileSection}>
                <View style={styles.profileCard}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatar}></View>
                    <View style={styles.profileTextContainer}>
                    <Text style={styles.profileName}>{courier?.fullName}</Text>
                    <Text style={styles.profileStatus}>
                        {courier?.onTheLine && courier?.status === "active" && "В сети"}
                        {!courier?.onTheLine && courier?.status === "active" && "Не в сети"}
                        {courier?.status === "inActive" && "Ограничен"}
                    </Text>
                    </View>
                </View>

                <View style={styles.statusContainer}>
                    <View>
                    <Text style={styles.statusText}>{courier?.onTheLine ? "Online" : "Offline"}</Text>
                    </View>
                    <View style={styles.switchContainer}>
                        {courier?.status === "active" && <MySwitchToggle value={courier?.onTheLine} onPress={changeOnTheLine} />}
                        {courier?.status !== "active" && <View style={styles.disabledSwitch}>
                            <View style={styles.disabledSwitchThumb}></View>  
                        </View>}
                    </View>
                </View>
                </View>

                <View style={styles.incomeCard}>
                <View>
                    <Text style={styles.incomeTitle}>Сегодня вы заработали:</Text>
                </View>

                <View style={styles.incomeAmount}>
                    <View style={styles.incomeRow}>
                    <Text style={styles.incomeValue}>{courier?.income}</Text>
                    <Text style={styles.incomeCurrency}>₸</Text>
                    </View>
                </View>
                </View>
            </View>

            <View style={styles.orderSection}>
                {courier?.status === "active" && courier?.onTheLine && <View style={styles.centerContent}>
                    {order === null ? <>
                        <Image
                            source={require("../assets/images/box.png")}
                            style={{width: 42, height: 42}}
                            resizeMode="contain"
                        />  
                        <View>
                            <Text style={styles.noOrderTitle}>Заявок пока нет</Text>
                            <Text style={styles.noOrderSubtitle}>Тут будут доступны входящие заявки</Text>
                        </View>
                    </>
                    : 
                    <TouchableOpacity style={styles.fullWidth} onPress={() => {router.push("./orderStatus")}}>
                        <View style={styles.orderCard}>
                            <View style={styles.orderDetails}>
                                {order?.products?.b12 > 0 && <Text style={styles.orderItem}>{`12,5л: ${order?.products?.b12} бутылей`}</Text>}
                                {order?.products?.b19 > 0 && <Text style={styles.orderItem}>{`19,8л: ${order?.products?.b19} бутылей`}</Text>}

                                <Text style={styles.addressLabel}>Адресс:</Text>
                                <Text style={styles.addressValue}>{order.clientAddress}</Text>

                                <Text style={styles.orderPrice}>({order?.sum} ₸)</Text>
                            </View>
                            <Image
                                source={require("../assets/images/arrowRight.png")}
                                style={{width: 20, height: 20, marginLeft: 10}}
                                resizeMode="contain"
                            />
                        </View>
                    </TouchableOpacity>
                    }
                    
                </View>
                }

                {courier?.status === "active" && !courier?.onTheLine && <View style={styles.centerContent}>
                    <Image
                        source={require("../assets/images/wifi.png")}
                        style={{width: 42, height: 42}}
                        resizeMode="contain"
                    />  

                    <Text style={styles.offlineTitle}>Вы не в сети!</Text>
                    <Text style={styles.offlineSubtitle}>Войдите в онлайн, чтобы получать заказы</Text>
                </View>}

                {courier?.status === "inActive" && <View>
                    <View style={styles.centeredIcon}>
                        <Image
                        source={require("../assets/images/danger.png")}
                        style={{width: 42, height: 42}}
                        resizeMode="contain"
                        />  
                    </View>

                    <Text style={styles.blockedTitle}>Заказы не доступны!</Text>
                    <Text style={styles.blockedSubtitle}>Вы временно ограничены в получении заказов.</Text>

                    <View style={styles.blockInfoButtonContainer}>
                        <MyButton
                        title="Узнать причину блокировки"
                        onPress={() => {setInActiveModal(true)}}
                        variant="outlined"
                        width="full"
                        />
                    </View>
                </View>
                }

                {courier?.status === "awaitingVerfication" && <View style={styles.centerContent}>
                <Image
                    source={require("../assets/images/danger.png")}
                    style={{width: 42, height: 42}}
                    resizeMode="contain"
                />  

                <Text style={styles.verificationTitle}>Ожидание верификации</Text>
                <Text style={styles.verificationSubtitle}>Заявки будут доступны после верификации</Text>
                </View>}
            </View>

            <Modal
                visible={inActiveModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setInActiveModal(false)}
            >
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                    Ваш аккаунт заблокирован
                    </Text>
                    <Text style={styles.modalLabel}>
                    Причина блокировки:
                    </Text>
                    <Text style={styles.modalReason}>
                    Не приняли заказ три раза подряд
                    </Text>
                    <Text style={styles.modalLabel}>
                    Заказы будут доступны через:
                    </Text>
                    <Text style={styles.modalReason}>
                    12 часов
                    </Text>

                    <View style={styles.modalButton}>
                    <MyButton
                        title="Понятно"
                        onPress={() => {setInActiveModal(false)}}
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
        paddingTop: 38
    },
    header: {
        backgroundColor: 'white',
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    profileSection: {
        backgroundColor: '#F6F6F6',
        paddingTop: 16,
        paddingHorizontal: 24
    },
    profileCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#808080'
    },
    profileTextContainer: {
        marginLeft: 8
    },
    profileName: {
        fontWeight: '500'
    },
    profileStatus: {
        color: '#4F4F4F',
        fontSize: 14,
        marginTop: 4
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statusText: {
        color: 'rgba(86, 86, 86, 0.52)',
        fontSize: 14,
        marginTop: 4
    },
    switchContainer: {
        marginLeft: 8
    },
    disabledSwitch: {
        width: 51,
        height: 32,
        backgroundColor: '#E5E5EA',
        borderRadius: 16,
        justifyContent: 'center'
    },
    disabledSwitchThumb: {
        width: 31,
        height: 31,
        borderRadius: 15.5,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#AAAAAA'
    },
    incomeCard: {
        marginTop: 16,
        backgroundColor: '#9AC1C4',
        borderRadius: 16,
        padding: 16
    },
    incomeTitle: {
        fontSize: 14
    },
    incomeAmount: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    incomeRow: {
        flexDirection: 'row'
    },
    incomeValue: {
        fontSize: 32,
        fontWeight: '500'
    },
    incomeCurrency: {
        fontSize: 32,
        fontWeight: '500',
        marginLeft: 12
    },
    orderSection: {
        marginTop: 78,
        borderTopWidth: 2,
        borderColor: '#c4c2c2',
        paddingTop: 32,
        marginHorizontal: 24
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    noOrderTitle: {
        textAlign: 'center',
        fontSize: 24,
        color: '#545454',
        marginTop: 12
    },
    noOrderSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#545454',
        marginTop: 12
    },
    fullWidth: {
        width: '100%'
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    orderDetails: {
        width: '85%'
    },
    orderItem: {
        fontSize: 18,
        fontWeight: '500'
    },
    addressLabel: {
        fontSize: 14,
        color: '#606060',
        marginTop: 8
    },
    addressValue: {
        marginTop: 4,
        marginLeft: 8
    },
    orderPrice: {
        fontSize: 18,
        color: '#606060',
        marginTop: 8
    },
    offlineTitle: {
        textAlign: 'center',
        fontSize: 24,
        color: '#545454',
        marginTop: 12
    },
    offlineSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#545454',
        marginTop: 12
    },
    centeredIcon: {
        marginTop: 4,
        justifyContent: 'center',
        alignItems: 'center'
    },
    blockedTitle: {
        textAlign: 'center',
        fontSize: 24,
        color: '#545454',
        marginTop: 12
    },
    blockedSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#545454',
        marginTop: 12
    },
    blockInfoButtonContainer: {
        marginTop: 20
    },
    verificationTitle: {
        textAlign: 'center',
        fontSize: 24,
        color: '#545454',
        marginTop: 12
    },
    verificationSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#545454',
        marginTop: 12
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        paddingTop: 48,
        width: '92%'
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center'
    },
    modalLabel: {
        textAlign: 'center',
        fontSize: 14,
        color: '#999999',
        marginTop: 12
    },
    modalReason: {
        textAlign: 'center',
        fontSize: 14,
        color: '#DC1818'
    },
    modalButton: {
        marginTop: 40
    }
});

export default Main;