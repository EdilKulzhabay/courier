import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { apiService } from "../api/services"
import MyButton from "../components/MyButton"
import MySwitchToggle from "../components/MySwitchToggle"
import { CourierData } from "../types/interfaces"
import { registerForPushNotificationsAsync } from "../utils/registerForPushNotificationsAsync"
import { getCourierData, removeCourierData, removeNotificationTokenData, removeTokenData, saveNotificationTokenData, updateCourierData } from "../utils/storage"

const Settings = () => {
    const router = useRouter();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
    const [courier, setCourier] = useState<CourierData | null>(null);
    const [notification, setNotification] = useState(true);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [notificationOffLoading, setNotificationOffLoading] = useState(false);

    const fetchCourierData = async () => {
        const courierData = await getCourierData();
        if (courierData?._id) {
            setCourier({...courierData});
        } else {
            router.push("./start");
        }
    };

    useEffect(() => {
        fetchCourierData();
    }, []);

    const logout = async () => {
        setLogoutLoading(true);
        if (courier?._id) {
            await apiService.updateData(courier._id, "onTheLine", false);
        }
        await removeTokenData();
        await removeCourierData();
        await removeNotificationTokenData();
        setIsModalVisible(false);
        router.push("./start");
        setLogoutLoading(false);
    }

    const notificationOff = async () => {
        setNotificationOffLoading(true);
        setNotification(false)
        if (courier?._id) {
            await apiService.updateData(courier._id, "notificationPushToken", "");
            await updateCourierData({ ...courier, notificationPushToken: "" });
            await saveNotificationTokenData({ notificationPushToken: "" });
            await fetchCourierData();
        } 
        setIsNotificationModalVisible(false);
        setNotificationOffLoading(false);
    }

    const notificationOn = async () => {
        setNotification(true)
        const token = await registerForPushNotificationsAsync();
        if (token && courier && courier?.notificationPushToken !== token) {
            await apiService.updateData(courier._id, "notificationPushToken", token);
            await updateCourierData({ ...courier, notificationPushToken: token });
            await saveNotificationTokenData({ notificationPushToken: token });
            await fetchCourierData();
        }
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
                <Text style={styles.headerTitle}>Настройки</Text>
            </View>

            <View style={styles.profileInfo}>
                <Text style={styles.userName}>{courier?.fullName}</Text>
            </View>

            <ScrollView style={styles.menuContainer}>
                <TouchableOpacity
                    onPress={() => {router.push("./changeData")}}
                    style={styles.menuItem}
                >
                    <View style={styles.menuItemLeft}>
                        <Image
                            source={require("../assets/images/edit.png")}
                            style={styles.menuIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.menuText}>Изменить данные</Text>
                    </View>

                    <Image
                        source={require("../assets/images/arrowRight.png")}
                        style={styles.arrowIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {router.push("./analytics")}}
                    style={[styles.menuItem, styles.menuItemSpaced]}
                >
                    <View style={styles.menuItemLeft}>
                        <Image
                            source={require("../assets/images/chart.png")}
                            style={styles.menuIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.menuText}>Аналитика</Text>
                    </View>

                    <Image
                        source={require("../assets/images/arrowRight.png")}
                        style={styles.arrowIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <View style={styles.divider}></View>

                <TouchableOpacity
                    onPress={() => {}}
                    disabled={true}
                    style={[styles.menuItem, styles.menuItemSpaced]}
                >
                    <View style={styles.menuItemLeft}>
                        <Image
                            source={require("../assets/images/location.png")}
                            style={styles.menuIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.menuText}>Город</Text>
                    </View>

                    <View style={styles.menuItemRight}>
                        <Text style={styles.disabledText}>Алматы</Text>
                        <Image
                            source={require("../assets/images/arrowRight.png")}
                            style={styles.arrowIcon}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {}}
                    disabled={true}
                    style={[styles.menuItem, styles.menuItemSpaced]}
                >
                    <View style={styles.menuItemLeft}>
                        <Image
                            source={require("../assets/images/language.png")}
                            style={styles.menuIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.menuText}>Язык</Text>
                    </View>

                    <View style={styles.menuItemRight}>
                        <Text style={styles.disabledText}>Русский</Text>
                        <Image
                            source={require("../assets/images/arrowRight.png")}
                            style={styles.arrowIcon}
                            resizeMode="contain"
                        />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {}}
                    style={[styles.menuItem, styles.menuItemSpaced]}
                >
                    <View style={styles.menuItemLeft}>
                        <Image
                            source={require("../assets/images/notification.png")}
                            style={styles.menuIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.menuText}>Уведомления и звуки</Text>
                    </View>

                    <View style={styles.menuItemRight}>
                        <MySwitchToggle
                            value={notification}
                            onPress={() => {
                                if (notification) {
                                    setIsNotificationModalVisible(true);
                                } else {
                                    notificationOn();
                                }
                            }}
                        />
                    </View>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.footer}>
                <MyButton
                    title="Выйти"
                    onPress={() => {
                        setIsModalVisible(true);
                    }}
                    variant="outlined"
                />
            </View>

            <Modal 
                visible={isModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Выход
                        </Text>
                        <Text style={styles.modalText}>Вы действительно хотите выйти?</Text>
                        <View style={styles.modalButtons}>
                            <View style={styles.modalButton}>
                                <MyButton
                                    title="Выйти"
                                    onPress={logout}
                                    variant="contained"
                                    loading={logoutLoading}
                                />
                            </View>
                            <View style={[styles.modalButton, styles.modalButtonRight]}>
                                <MyButton
                                    title="Отмена"
                                    onPress={() => {
                                        setIsModalVisible(false);
                                    }}
                                    variant="outlined"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isNotificationModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsNotificationModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Если вы отключите уведомления, вы не сможете получать новые заказы.
                        </Text>
                        <Text style={styles.modalText}>Вы действительно хотите выключить уведомления?</Text>
                        <View style={styles.modalButtons}>
                            <View style={styles.modalButton}>
                                <MyButton
                                    title="Выключить"
                                    onPress={notificationOff}
                                    variant="contained"
                                    loading={notificationOffLoading}
                                />
                            </View>
                            <View style={[styles.modalButton, styles.modalButtonRight]}>
                                <MyButton
                                    title="Отмена"
                                    onPress={() => {
                                        setIsNotificationModalVisible(false);
                                    }}
                                    variant="outlined"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
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
    profileInfo: {
        alignItems: 'center',
        marginBottom: 16
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 8
    },
    menuContainer: {
        marginTop: 20,
        paddingHorizontal: 40
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12
    },
    menuItemSpaced: {
        marginTop: 8
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    menuIcon: {
        width: 24,
        height: 24
    },
    menuText: {
        marginLeft: 16
    },
    arrowIcon: {
        width: 24,
        height: 24
    },
    divider: {
        marginTop: 16,
        height: 1,
        width: '100%',
        backgroundColor: '#ECECEC'
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    disabledText: {
        color: '#ADADAD'
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 56
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
    modalText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#999999',
        marginTop: 16
    },
    modalButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32
    },
    modalButton: {
        flex: 1
    },
    modalButtonRight: {
        marginLeft: 12
    }
});

export default Settings