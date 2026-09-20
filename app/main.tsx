import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    BackHandler,
    Image,
    ImageBackground,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { apiService } from "../api/services";
import MyButton from "../components/MyButton";
import MySwitchToggle from "../components/MySwitchToggle";
import NewVersionModal from "../components/NewVersionModal";
import { CourierData, Order } from "../types/interfaces";
import { markNewVersionModalShown, shouldShowNewVersionModal } from "../utils/appVersion";
import { updateCourierData } from "../utils/storage";

declare global {
var isOnline: boolean | undefined;
}

const Main = () => {
    const router = useRouter();
    const [courier, setCourier] = useState<CourierData | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [capacity12, setCapacity12] = useState<number>(0);
    const [capacity19, setCapacity19] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [income, setIncome] = useState<number>(0);
    const [deliveredBottlesToday, setDeliveredBottlesToday] = useState<number>(0);
    const [ratingYesterday, setRatingYesterday] = useState<number | null>(null);
    const [lastButtonPressTime, setLastButtonPressTime] = useState<number>(0);
    const [refreshing, setRefreshing] = useState(false);

    const [inActiveModal, setInActiveModal] = useState(false);
    const [carDataModalVisible, setCarDataModalVisible] = useState(false);
    const [newVersionModalVisible, setNewVersionModalVisible] = useState(false);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        if (courierData.success && courierData.userData) {
        await updateCourierData(courierData.userData);
        setCourier(courierData.userData);
        setCapacity12(courierData.userData.capacity12 || 0);
        setCapacity19(courierData.userData.capacity19 || 0);
        if (courierData.userData.order?.orderId || courierData.userData.order?.stopType === "aquaMarket") {
            setOrder(courierData.userData.order);
        } else {
            setOrder(null);
        }
        }
    };

    const getIncome = useCallback(async () => {
        try {
            const res = await apiService.getIncome();
            if (res?.success) {
                setIncome(Number(res.income) || 0);
            }
        } catch (error) {
            console.error("Ошибка при получении дохода:", error);
        }
    }, []);

    const getDeliveredBottlesToday = useCallback(async () => {
        try {
            const res = await apiService.getDeliveredBottlesToday();
            if (res?.success) {
                setDeliveredBottlesToday(Number(res.deliveredBottles) || 0);
            }
        } catch (error) {
            console.error("Ошибка при получении доставленных бутылей:", error);
        }
    }, []);

    const getRating = useCallback(async () => {
        try {
            const res = await apiService.getRating();
            if (res?.success) {
                setRatingYesterday(res.rating === null || res.rating === undefined ? null : Number(res.rating));
            }
        } catch (error) {
            console.error("Ошибка при получении рейтинга:", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
        fetchCourierData();
        getIncome();
        getDeliveredBottlesToday();
        getRating();
        }, [getIncome, getDeliveredBottlesToday, getRating]),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([fetchCourierData(), getIncome(), getDeliveredBottlesToday(), getRating()]);
        } finally {
            setRefreshing(false);
        }
    }, [getIncome, getDeliveredBottlesToday, getRating]);

    useFocusEffect(
        useCallback(() => {
        const onBackPress = () => true;

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress,
        );

        return () => {
            subscription.remove();
        };
        }, []),
    );

    // Функция для получения и отправки текущего местоположения
    const sendCurrentLocation = async (source: string) => {
        try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            console.warn("⚠️ Нет разрешения на геолокацию");
            return false;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        if (courier?._id) {
            const timestamp = new Date(location.timestamp);
            timestamp.setHours(timestamp.getHours() + 5);

            const locationData = {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
            timestamp: timestamp,
            accuracy: location.coords.accuracy,
            source: source,
            };

            await apiService.updateData(courier._id, "point", locationData);
            return true;
        }
        } catch (error) {
        console.error(
            `❌ ${source}: Ошибка получения/отправки геолокации:`,
            error,
        );
        return false;
        }
    };

    const changeOnTheLine = async () => {
        if (!courier?._id) {
            return;
        }

        if (order?.orderId && courier?.status === "active") {
            alert(
                "Вы не можете изменить статус, пока не выполните существующий заказ",
            );
            return;
        }

        const previousOnlineStatus = courier.onTheLine;
        const newOnlineStatus = !previousOnlineStatus;

        // Оптимистично обновляем UI сразу, не дожидаясь сети/GPS
        setCourier({ ...courier, onTheLine: newOnlineStatus });
        global.isOnline = newOnlineStatus;

        if (newOnlineStatus) {
            console.log(
                "📍 Пользователь перешел в онлайн, отправляем текущее местоположение",
            );
            // Не блокируем переключение статуса ожиданием GPS-фикса
            sendCurrentLocation("ПЕРЕХОД_В_ОНЛАЙН");
        } else {
            console.log(
                "📴 Пользователь перешел в офлайн, отправка геолокации остановлена",
            );
        }

        try {
            const res = await apiService.updateData(
                courier._id,
                "onTheLine",
                newOnlineStatus,
            );

            if (!res.success) {
                setCourier({ ...courier, onTheLine: previousOnlineStatus });
                global.isOnline = previousOnlineStatus;
            }
        } catch (error) {
            console.error("Ошибка при изменении статуса онлайн:", error);
            setCourier({ ...courier, onTheLine: previousOnlineStatus });
            global.isOnline = previousOnlineStatus;
        }
    };

    // Модалка «Доступна новая версия» — не чаще раза в день, только если версия
    // из CRM (courier.latestAppVersion) отличается от установленной APP_VERSION.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const show = await shouldShowNewVersionModal(courier?.latestAppVersion);
            if (!cancelled && show) {
                setNewVersionModalVisible(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [courier?.latestAppVersion]);

    const handleUpdateApp = async () => {
        await markNewVersionModalShown();
        setNewVersionModalVisible(false);
        const androidStoreUrl = "market://details?id=com.tibetskayacourier2.app";
        const androidFallbackUrl = "https://play.google.com/store/apps/details?id=com.tibetskayacourier2.app";
        // TODO: заменить на реальную ссылку App Store, когда приложение курьера будет опубликовано
        const iosStoreUrl = "https://apps.apple.com/kz/app/tibetskaya-courier/idTODO";
        try {
            if (Platform.OS === "ios") {
                await Linking.openURL(iosStoreUrl);
                return;
            }
            const supported = await Linking.canOpenURL(androidStoreUrl);
            await Linking.openURL(supported ? androidStoreUrl : androidFallbackUrl);
        } catch (error) {
            console.error("❌ Не удалось открыть стор для обновления:", error);
            await Linking.openURL(androidFallbackUrl).catch(() => {});
        }
    };

    const handleRemindVersionLater = async () => {
        await markNewVersionModalShown();
        setNewVersionModalVisible(false);
    };

    const hasCarData = (data: CourierData | null) =>
        !!data?.carData?.brand?.trim() &&
        !!data?.carData?.model?.trim() &&
        !!data?.carData?.color?.trim() &&
        !!data?.carData?.plateNumber?.trim();

    const getOrder = async () => {
        if (!hasCarData(courier)) {
        setCarDataModalVisible(true);
        return;
        }
        if (Date.now() - lastButtonPressTime < 20000) {
        return;
        }
        setLastButtonPressTime(Date.now());
        setLoading(true);
        const courierData = await apiService.getData();
        const fetchedOrder = courierData.userData?.order;
        if (courierData.success && fetchedOrder?.orderId) {
        setOrder(fetchedOrder);
        setCourier(courierData.userData);
        setCapacity12(courierData.userData.capacity12 || 0);
        setCapacity19(courierData.userData.capacity19 || 0);
        setLoading(false);
        return;
        }
        if (courierData.success && fetchedOrder?.stopType === "aquaMarket") {
        setOrder(fetchedOrder);
        setCourier(courierData.userData);
        setCapacity12(courierData.userData.capacity12 || 0);
        setCapacity19(courierData.userData.capacity19 || 0);
        setLoading(false);
        router.push("./aquaMarketStop");
        return;
        }
        if (courier?.fullName) {
        const orderData = await apiService.needToGiveTheOrderToCourier(
            courier?.fullName,
        );
        if (orderData.success) {
            setLoading(false);
        } else {
            Alert.alert("Ошибка", orderData.message);
            setLoading(false);
        }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                source={require("../assets/images/smallLogo.png")}
                style={{ width: 129, height: 48 }}
                resizeMode="contain"
                />
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                {ratingYesterday !== null && (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>{ratingYesterday.toFixed(1)}</Text>
                        <Text style={styles.ratingBadgeStar}>★</Text>
                    </View>
                )}

                <TouchableOpacity
                onPress={() => {
                    router.push("./settings");
                }}
                >
                <Image
                    source={require("../assets/images/profile.png")}
                    style={{ width: 30, height: 30 }}
                    resizeMode="contain"
                />
                </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.profileSection}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileInfo}>
                        <View style={styles.avatar}>
                            <Text>{courier?.firstName.charAt(0).toUpperCase()}{courier?.lastName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.profileTextContainer}>
                            <Text style={styles.profileName}>{courier?.fullName}</Text>
                            <Text style={styles.profileStatus}>
                            {courier?.onTheLine &&
                                courier?.status === "active" &&
                                "В сети"}
                            {!courier?.onTheLine &&
                                courier?.status === "active" &&
                                "Не в сети"}
                            {courier?.status === "inActive" && "Ограничен"}
                            </Text>
                        </View>
                        </View>

                        <View style={styles.statusContainer}>
                        <View style={styles.switchContainer}>
                            {courier?.status === "active" && (
                                <MySwitchToggle
                                    value={courier?.onTheLine}
                                    onPress={changeOnTheLine}
                                />
                            )}
                            {courier?.status !== "active" && (
                            <View style={styles.disabledSwitch}>
                                <View style={styles.disabledSwitchThumb}></View>
                            </View>
                            )}
                        </View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => {
                        router.push("./analytics");
                    }}>
                        <ImageBackground
                        source={require("../assets/images/infoBG.png")}
                        style={styles.incomeCard}
                        imageStyle={styles.incomeCardImage}
                        resizeMode="cover"
                        >
                        <View>
                            <Text style={styles.incomeTitle}>Сегодня вы заработали</Text>
                        </View>

                        <View style={styles.incomeAmount}>
                            <View style={styles.incomeRow}>
                            <Text style={styles.incomeValue}>{income}</Text>
                            <Text style={styles.incomeCurrency}>₸</Text>
                            </View>
                        </View>
                        </ImageBackground>
                    </TouchableOpacity>

                    <View style={[styles.section, {flexDirection: "row", justifyContent: "space-between", alignItems: "center"}]}>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <View style={{width: 36, height: 36, justifyContent: "center", alignItems: "center", backgroundColor: "#2a71fc", borderRadius: "100%"}}>
                                <Image source={require("../assets/images/truck.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                            </View>
                            <View style={{marginLeft: 12}}>
                                <Text style={{fontSize: 12, fontWeight: "500", color: "#292D32"}}>Всего доставлено</Text>
                                <Text style={{fontSize: 10, fontWeight: "400", color: "#6A7282"}}>за сегодня</Text>
                            </View>
                        </View>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <View style={{flexDirection: "row", alignItems: "flex-end"}}>
                                <Text style={{fontSize: 24, fontWeight: "500", color: "#2a71fc"}}>{deliveredBottlesToday}</Text>
                                <Text style={{fontSize: 10, fontWeight: "400", color: "#6A7282", marginLeft: 4, marginBottom: 4}}>бутылей</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.capacityTitle}>Остатки в машине</Text>
                    <View style={[styles.section, {flexDirection: "row", justifyContent: "space-between", alignItems: "center"}]}>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <Image
                                source={require("../assets/images/capacityBottle.png")}
                                style={{ width: 25, height: 40 }}
                                resizeMode="contain"
                            />
                            <Text style={{fontSize: 16, fontWeight: "500", color: "#000000", marginLeft: 8}}>19,8л</Text>
                        </View>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <View style={{width: 1, height: 34, backgroundColor: "#E3E3E3"}} />
                            <View style={{marginLeft: 12}}>
                                <View style={{flexDirection: "row", alignItems: "center"}}>
                                    <View style={{width: 6, height: 6, backgroundColor: "#00a839", borderRadius: "100%"}} />
                                    <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282", marginLeft: 4}}>Полных</Text>
                                </View>
                                <Text style={{fontSize: 18, fontWeight: "500", color: "#00a839", marginLeft: 10}}>{capacity19}</Text>
                            </View>
                            <View style={{width: 1, height: 34, backgroundColor: "#E3E3E3", marginLeft: 12}} />
                            <View style={{marginLeft: 12}}>
                                <View style={{flexDirection: "row", alignItems: "center"}}>
                                    <View style={{width: 6, height: 6, backgroundColor: "#f84f00", borderRadius: "100%"}} />
                                    <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282", marginLeft: 4}}>Пустых</Text>
                                </View>
                                <Text style={{fontSize: 18, fontWeight: "500", color: "#f84f00", marginLeft: 10}}>{courier?.emptyBottles19 || 0}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.section, {flexDirection: "row", justifyContent: "space-between", alignItems: "center"}]}>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <Image
                                source={require("../assets/images/capacityBottle.png")}
                                style={{ width: 25, height: 40 }}
                                resizeMode="contain"
                            />
                            <Text style={{fontSize: 16, fontWeight: "500", color: "#000000", marginLeft: 8}}>12,5л</Text>
                        </View>
                        <View style={{flexDirection: "row", alignItems: "center"}}>
                            <View style={{width: 1, height: 34, backgroundColor: "#E3E3E3"}} />
                            <View style={{marginLeft: 12}}>
                                <View style={{flexDirection: "row", alignItems: "center"}}>
                                    <View style={{width: 6, height: 6, backgroundColor: "#00a839", borderRadius: "100%"}} />
                                    <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282", marginLeft: 4}}>Полных</Text>
                                </View>
                                <Text style={{fontSize: 18, fontWeight: "500", color: "#00a839", marginLeft: 10}}>{capacity12}</Text>
                            </View>
                            <View style={{width: 1, height: 34, backgroundColor: "#E3E3E3", marginLeft: 12}} />
                            <View style={{marginLeft: 12}}>
                                <View style={{flexDirection: "row", alignItems: "center"}}>
                                    <View style={{width: 6, height: 6, backgroundColor: "#f84f00", borderRadius: "100%"}} />
                                    <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282", marginLeft: 4}}>Пустых</Text>
                                </View>
                                <Text style={{fontSize: 18, fontWeight: "500", color: "#f84f00", marginLeft: 10}}>{courier?.emptyBottles12 || 0}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={{
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        backgroundColor: "#f0f4fd",
                        padding: 12,
                        borderRadius: 8,
                        marginTop: 12,
                        marginBottom: 24,
                        gap: 12,
                    }}>
                        <Image source={require("../assets/images/info.png")} style={{width: 30, height: 30}} resizeMode='contain' />
                        <View>
                            <Text style={{fontSize: 12, fontWeight: '500', color: '#223755'}}>
                                Остатки обновляются автоматически
                            </Text>
                            <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>
                                после каждого завершённого заказа
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.orderSection}>
                {courier?.status === "active" && courier?.onTheLine && (
                    <View style={styles.centerContent}>
                    {order === null ? (
                        <>
                        <Image
                            source={require("../assets/images/noOrders.png")}
                            style={{ width: 128, height: 128 }}
                            resizeMode="contain"
                        />

                        <Text style={styles.offlineTitle}>Заказов пока нет</Text>
                        <Text style={[styles.offlineSubtitle, {marginBottom: 12}]}>
                        Как только появится новый заказ, вы увидите его здесь
                        </Text>
                        <MyButton
                            title="Получить заказ"
                            onPress={getOrder}
                            variant="contained"
                            loading={loading}
                        />
                        </>
                    ) : order?.stopType === "aquaMarket" ? (
                        <TouchableOpacity
                        style={styles.fullWidth}
                        onPress={() => {
                            router.push("./aquaMarketStop");
                        }}
                        >
                        <View style={styles.orderCard}>
                            <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start"}}>
                            <View style={{flexDirection: "row", alignItems: "center"}}>
                                <View style={{width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: "100%"}}>
                                <Image
                                    source={require("../assets/images/cube.png")}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                />
                                </View>
                                <View style={{marginLeft: 12}}>
                                <Text style={{fontSize: 14, fontWeight: "500", color: "#101828"}}>Поездка в аквамаркет</Text>
                                </View>
                            </View>
                            <View style={{backgroundColor: "#FFE2E2", borderRadius: 16, paddingVertical: 4, paddingHorizontal: 8}}>
                                <Text style={{fontSize: 12, fontWeight: "500", color: "#DC1818"}}>Новая остановка!</Text>
                            </View>
                            </View>

                            <View style={{marginTop: 12}}>
                            <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282"}}>Адрес аквамаркета</Text>
                            <Text style={{fontSize: 14, fontWeight: "400", color: "#101828"}}>{order?.aquaMarketAddress}</Text>
                            </View>
                        </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                        style={styles.fullWidth}
                        onPress={() => {
                            router.push("./orderStatus");
                        }}
                        >
                        <View style={styles.orderCard}>
                            <View style={{flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start"}}>
                            <View style={{flexDirection: "row", alignItems: "center"}}>
                                <View style={{width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: "100%"}}>
                                <Image
                                    source={require("../assets/images/cube.png")}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                />
                                </View>
                                <View style={{marginLeft: 12}}>
                                {(order?.products?.b12 ?? 0) > 0 && (
                                    <View style={{flexDirection: "row", alignItems: "center", columnGap: 4}}>
                                    <Text style={{fontSize: 14, fontWeight: "400", color: "#4A5565"}}>12,5л:</Text>
                                    <View style={{ width: 4, height: 4, backgroundColor: "#4A5565", borderRadius: "100%"}}/>
                                    <Text style={{fontSize: 14, fontWeight: "400", color: "#4A5565"}}>{order?.products?.b12} бутылей</Text>
                                    </View>
                                )}
                                {(order?.products?.b19 ?? 0) > 0 && (
                                    <View style={{flexDirection: "row", alignItems: "center", columnGap: 4}}>
                                    <Text style={{fontSize: 14, fontWeight: "400", color: "#4A5565"}}>19,8л:</Text>
                                    <View style={{ width: 4, height: 4, backgroundColor: "#4A5565", borderRadius: "100%"}}/>
                                    <Text style={{fontSize: 14, fontWeight: "400", color: "#4A5565"}}>{order?.products?.b19} бутылей</Text>
                                    </View>
                                )}
                                </View>
                            </View>
                            <View style={{backgroundColor: "#FFE2E2", borderRadius: 16, paddingVertical: 4, paddingHorizontal: 8}}>
                                <Text style={{fontSize: 12, fontWeight: "500", color: "#DC1818"}}>Новый заказ!</Text>
                            </View>
                            </View>

                            <View style={{marginTop: 12}}>
                            <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282"}}>Адрес доставки</Text>
                            <Text style={{fontSize: 14, fontWeight: "400", color: "#101828"}}>{order?.clientAddress}</Text>
                            </View>

                            <View style={{marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
                            <View style={{}}>
                                <Text style={{fontSize: 12, fontWeight: "400", color: "#6A7282"}}>Сумма доставки</Text>
                                <Text style={{fontSize: 20, fontWeight: "600", color: "#101828"}}>{order?.sum} ₸</Text>
                            </View>
                            <View style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center", backgroundColor: "#FB2C36", borderRadius: "100%"}}>
                                <Image
                                source={require("../assets/images/whiteChevronRight.png")}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                                />
                            </View>
                            </View>

                            {/* <View style={styles.orderDetails}>
                            {order?.products?.b12 > 0 && (
                                <Text
                                style={styles.orderItem}
                                >{`12,5л: ${order?.products?.b12} бутылей`}</Text>
                            )}
                            {order?.products?.b19 > 0 && (
                                <Text
                                style={styles.orderItem}
                                >{`19,8л: ${order?.products?.b19} бутылей`}</Text>
                            )}

                            <Text style={styles.addressLabel}>Адресс:</Text>
                            <Text style={styles.addressValue}>
                                {order.clientAddress}
                            </Text>

                            <Text style={styles.orderPrice}>({order?.sum} ₸)</Text>
                            </View>
                            <Image
                            source={require("../assets/images/arrowRight.png")}
                            style={{ width: 20, height: 20, marginLeft: 10 }}
                            resizeMode="contain"
                            /> */}
                        </View>
                        </TouchableOpacity>
                    )}
                    </View>
                )}

                {courier?.status === "active" && !courier?.onTheLine && (
                    <View style={styles.centerContent}>
                    <Image
                        source={require("../assets/images/offline.png")}
                        style={{ width: 128, height: 128 }}
                        resizeMode="contain"
                    />

                    <Text style={styles.offlineTitle}>Вы не в сети!</Text>
                    <Text style={styles.offlineSubtitle}>
                    Включите статус "В сети", чтобы начать получать заказы
                    </Text>
                    </View>
                )}

                {courier?.status === "inActive" && (
                    <View>
                    <View style={styles.centeredIcon}>
                        <Image
                        source={require("../assets/images/danger.png")}
                        style={{ width: 42, height: 42 }}
                        resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.blockedTitle}>Заказы не доступны!</Text>
                    <Text style={styles.blockedSubtitle}>
                        Вы временно ограничены в получении заказов.
                    </Text>

                    <View style={styles.blockInfoButtonContainer}>
                        <MyButton
                        title="Узнать причину блокировки"
                        onPress={() => {
                            setInActiveModal(true);
                        }}
                        variant="outlined"
                        width="full"
                        />
                    </View>
                    </View>
                )}

                {courier?.status === "awaitingVerfication" && (
                    <View style={styles.centerContent}>
                    <Image
                        source={require("../assets/images/danger.png")}
                        style={{ width: 42, height: 42 }}
                        resizeMode="contain"
                    />

                    <Text style={styles.verificationTitle}>Ожидание верификации</Text>
                    <Text style={styles.verificationSubtitle}>
                        Заявки будут доступны после верификации
                    </Text>
                    </View>
                )}
                </View>
            </ScrollView>

            <Modal
                visible={inActiveModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setInActiveModal(false)}
            >
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Ваш аккаунт заблокирован</Text>
                    <Text style={styles.modalLabel}>Причина блокировки:</Text>
                    <Text style={styles.modalReason}>
                    Не приняли заказ три раза подряд
                    </Text>
                    <Text style={styles.modalLabel}>Заказы будут доступны через:</Text>
                    <Text style={styles.modalReason}>12 часов</Text>

                    <View style={styles.modalButton}>
                    <MyButton
                        title="Понятно"
                        onPress={() => {
                        setInActiveModal(false);
                        }}
                        variant="contained"
                        width="full"
                    />
                    </View>
                </View>
                </View>
            </Modal>

            <Modal
                visible={carDataModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setCarDataModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Заполните данные машины</Text>
                    <Text style={styles.modalLabel}>
                    Чтобы получать заказы, укажите марку, модель, цвет и гос. номер вашей машины
                    </Text>

                    <View style={styles.modalButton}>
                    <MyButton
                        title="Заполнить данные"
                        onPress={() => {
                        setCarDataModalVisible(false);
                        router.push("./changeData");
                        }}
                        variant="contained"
                        width="full"
                    />
                    </View>
                    <View style={styles.modalSecondaryButton}>
                    <MyButton
                        title="Отмена"
                        onPress={() => setCarDataModalVisible(false)}
                        variant="outlined"
                        width="full"
                    />
                    </View>
                </View>
                </View>
            </Modal>

            <NewVersionModal
                visible={newVersionModalVisible}
                onUpdate={handleUpdateApp}
                onRemindLater={handleRemindVersionLater}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 38,
    },
    header: {
        backgroundColor: "white",
        padding: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF2F2",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 12,
    },
    ratingBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#292D32",
        marginRight: 4,
    },
    ratingBadgeStar: {
        fontSize: 13,
        color: "#FFB800",
    },
    profileSection: {
        backgroundColor: "#F6F6F6",
        paddingTop: 16,
        paddingHorizontal: 24,
    },
    profileCard: {
        flexDirection: "row",
        backgroundColor: "white",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    profileInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#D1D5DC",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 16,
        fontWeight: "500",
        color: "#545454",
    },
    profileTextContainer: {
        marginLeft: 8,
    },
    profileName: {
        fontWeight: "500",
    },
    profileStatus: {
        color: "#4F4F4F",
        fontSize: 14,
        marginTop: 4,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    statusText: {
        color: "rgba(86, 86, 86, 0.52)",
        fontSize: 14,
        marginTop: 4,
    },
    switchContainer: {
        marginLeft: 8,
    },
    disabledSwitch: {
        width: 51,
        height: 32,
        backgroundColor: "#E5E5EA",
        borderRadius: 16,
        justifyContent: "center",
    },
    disabledSwitchThumb: {
        width: 31,
        height: 31,
        borderRadius: 15.5,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#AAAAAA",
    },
    incomeCard: {
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        overflow: "hidden",
    },
    incomeCardImage: {
        borderRadius: 16,
    },
    incomeTitle: {
        fontSize: 14,
    },
    incomeAmount: {
        marginTop: 16,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    incomeRow: {
        flexDirection: "row",
    },
    incomeValue: {
        fontSize: 32,
        fontWeight: "500",
    },
    incomeCurrency: {
        fontSize: 32,
        fontWeight: "500",
        marginLeft: 12,
    },
    orderSection: {
        marginTop: 38,
        borderTopWidth: 2,
        borderColor: "#c4c2c2",
        paddingTop: 32,
        marginHorizontal: 24,
    },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    noOrderTitle: {
        textAlign: "center",
        fontSize: 24,
        color: "#545454",
        marginTop: 12,
    },
    noOrderSubtitle: {
        textAlign: "center",
        fontSize: 14,
        color: "#545454",
        marginTop: 12,
    },
    fullWidth: {
        width: "100%",
    },
    orderCard: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    orderDetails: {
        width: "85%",
    },
    orderItem: {
        fontSize: 18,
        fontWeight: "500",
    },
    addressLabel: {
        fontSize: 14,
        color: "#606060",
        marginTop: 8,
    },
    addressValue: {
        marginTop: 4,
        marginLeft: 8,
    },
    orderPrice: {
        fontSize: 18,
        color: "#606060",
        marginTop: 8,
    },
    offlineTitle: {
        textAlign: "center",
        fontSize: 24,
        color: "#545454",
        marginTop: 12,
    },
    offlineSubtitle: {
        textAlign: "center",
        fontSize: 14,
        color: "#545454",
        marginTop: 12,
    },
    centeredIcon: {
        marginTop: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    blockedTitle: {
        textAlign: "center",
        fontSize: 24,
        color: "#545454",
        marginTop: 12,
    },
    blockedSubtitle: {
        textAlign: "center",
        fontSize: 14,
        color: "#545454",
        marginTop: 12,
    },
    blockInfoButtonContainer: {
        marginTop: 20,
    },
    verificationTitle: {
        textAlign: "center",
        fontSize: 24,
        color: "#545454",
        marginTop: 12,
    },
    verificationSubtitle: {
        textAlign: "center",
        fontSize: 14,
        color: "#545454",
        marginTop: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 24,
        paddingTop: 48,
        width: "92%",
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "600",
        textAlign: "center",
    },
    modalLabel: {
        textAlign: "center",
        fontSize: 14,
        color: "#999999",
        marginTop: 12,
    },
    modalReason: {
        textAlign: "center",
        fontSize: 14,
        color: "#DC1818",
    },
    modalButton: {
        marginTop: 40,
    },
    modalSecondaryButton: {
        marginTop: 12,
    },
    capacityTitle: {
        fontSize: 16,
        marginTop: 16,
        fontWeight: "500",
        color: "#4A5565",
    },
    capacityInput: {
        borderWidth: 1,
        borderColor: "#E5E5EA",
        borderRadius: 8,
        padding: 8,
    },
    capacityButtonContainer: {
        marginTop: 10,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30, // Add padding at the bottom for the modal
    },
    section: {
        backgroundColor: "white", 
        borderRadius: 8, 
        padding: 16,
        marginTop: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    }
});

export default Main;
