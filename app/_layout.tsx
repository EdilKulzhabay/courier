import { apiService } from '@/api/services';
import OrderNotification from '@/components/OrderNotification';
import { CourierData, Order } from '@/types/interfaces';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { isRemotePushSupported, loadNotifications } from '@/utils/notifications';
import { getCourierData, getTokenData, saveNotificationTokenData, updateCourierData } from '@/utils/storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, SafeAreaView, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";

TaskManager.defineTask(
    BACKGROUND_NOTIFICATION_TASK,
    async ({ data, error, executionInfo }) => {
        console.log("✅ Received a notification in the background!", {
            data,
            error,
            executionInfo,
        });
    }
);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const LOCATION_TASK_NAME = 'background-location-task';

declare global {
  var courierId: string | undefined;
  var isOnline: boolean | undefined;
}

// Функция для отправки геолокации
const sendLocationToServer = async (location: any, source: string) => {
    try {
        const courierId = global.courierId;
        const isOnline = global.isOnline;
        
        if (!courierId) {
            console.warn(`⚠️ ${source}: Нет ID курьера для отправки геолокации`);
            return false;
        }

        // Проверяем, что пользователь онлайн
        if (!isOnline) {
            console.log(`ℹ️ ${source}: Пользователь не в сети, пропускаем отправку геолокации`);
            return false;
        }

        // Корректируем время с учетом часового пояса
        const timestamp = new Date(location.timestamp);
        timestamp.setHours(timestamp.getHours() + 5);

        const locationData = {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
            timestamp: timestamp,
        };

        // Отправляем геолокацию через API
        await apiService.updateData(courierId, "point", locationData);
        
        return true;
    } catch (error) {
        console.error(`❌ ${source}: Ошибка отправки геолокации:`, error);
        return false;
    }
};

// ОСНОВНАЯ ЗАДАЧА ГЕОЛОКАЦИИ - ПО ДВИЖЕНИЮ
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('❌ ОСНОВНАЯ ЗАДАЧА: Ошибка:', error);
        return;
    }
    
    if (data) {
        const { locations } = data as any;
        if (locations && locations.length > 0) {
            const location = locations[0];
            
            // Проверяем онлайн статус перед отправкой
            if (global.isOnline) {
                await sendLocationToServer(location, 'ДВИЖЕНИЕ');
            } else {
                console.log('ℹ️ ОСНОВНАЯ ЗАДАЧА: Пользователь не в сети, пропускаем отправку');
            }
        }
    }
});

export default function RootLayout() {
    // Предотвращаем затухание экрана когда приложение открыто.
    // На web отключено: navigator.wakeLock — асинхронный, и при быстром
    // размонтировании (Fast Refresh, React 19 double-invoke) deactivate
    // срывается с ERR_KEEP_AWAKE_TAG_INVALID (баг expo-keep-awake web).
    if (Platform.OS !== 'web') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useKeepAwake();
    }
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();

    const [courier, setCourier] = useState<CourierData | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [showNotification, setShowNotification] = useState(false);
    const [isOrderAccepted, setIsOrderAccepted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
    const [pushToken, setPushToken] = useState<string | null>(null);

    const notificationListener = useRef<{ remove: () => void } | null>(null);
    const responseListener = useRef<{ remove: () => void } | null>(null);
    const hasInitializedAuth = useRef(false);

    useEffect(() => {
        if (!rootNavigationState?.key || hasInitializedAuth.current) {
            return;
        }

        hasInitializedAuth.current = true;
        let isMounted = true;

        const navigateToInitialRoute = (hasToken: boolean) => {
            const targetRoute = hasToken ? 'main' : 'start';
            if (segments[0] !== targetRoute) {
                router.replace(`/${targetRoute}`);
            }
        };

        const initAuth = async () => {
            try {
                const tokenData = await getTokenData();

                if (tokenData?.token) {
                    try {
                        const res = await apiService.getData();
                        if (res.success && res.userData) {
                            await updateCourierData(res.userData);
                            if (isMounted) {
                                setCourier(res.userData);
                            }
                        } else {
                            const cached = await getCourierData();
                            if (cached && isMounted) {
                                setCourier(cached);
                            }
                        }
                    } catch {
                        const cached = await getCourierData();
                        if (cached && isMounted) {
                            setCourier(cached);
                        }
                    }

                    if (isMounted) {
                        navigateToInitialRoute(true);
                    }
                } else if (isMounted) {
                    navigateToInitialRoute(false);
                }
            } catch (error) {
                console.error('Ошибка при инициализации сессии:', error);
                const tokenData = await getTokenData();
                if (isMounted) {
                    navigateToInitialRoute(!!tokenData?.token);
                }
            } finally {
                if (isMounted) {
                    setIsInitialized(true);
                    await SplashScreen.hideAsync();
                }
            }
        };

        initAuth();

        return () => {
            isMounted = false;
        };
    }, [rootNavigationState?.key]);

    const requestPermissions = async () => {
        try {
            console.log('🔐 Запрашиваем разрешения...');
            
            // 1. Разрешение на геолокацию переднего плана
            const { status: fgLocationStatus } = await Location.requestForegroundPermissionsAsync();
            console.log('📍 Разрешение на геолокацию переднего плана:', fgLocationStatus);
            setLocationPermissionGranted(fgLocationStatus === 'granted');
            
            if (fgLocationStatus !== 'granted') {
                Alert.alert(
                    'Разрешение на геолокацию',
                    'Для работы приложения необходимо разрешение на доступ к местоположению'
                );
                return false;
            }
            
            // 2. Разрешение на геолокацию в фоне
            const { status: bgLocationStatus } = await Location.requestBackgroundPermissionsAsync();
            console.log('📍 Разрешение на фоновую геолокацию:', bgLocationStatus);
            
            if (bgLocationStatus !== 'granted') {
                Alert.alert(
                    'Фоновое отслеживание',
                    'Для отправки местоположения в фоне разрешите "Всегда" в настройках геолокации'
                );
            }
            
            // 3. Разрешение на уведомления
            if (isRemotePushSupported()) {
                const Notifications = await loadNotifications();
                if (Notifications) {
                    const { status: notificationStatus } = await Notifications.getPermissionsAsync();
                    if (notificationStatus !== 'granted') {
                        const { status } = await Notifications.requestPermissionsAsync();
                        console.log('🔔 Разрешение на уведомления:', status);
                        setNotificationPermissionGranted(status === 'granted');
                    } else {
                        setNotificationPermissionGranted(true);
                    }
                }
            }
            
            console.log('✅ Все разрешения обработаны');
            return fgLocationStatus === 'granted';
        } catch (error) {
            console.error('Ошибка при запросе разрешений:', error);
            return false;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            const Notifications = await loadNotifications();
            if (!Notifications || !isMounted) {
                return;
            }

            Notifications.setNotificationHandler({
                handleNotification: async (notification) => {
                    const title = notification.request.content.title;

                    if (title === "getLocation") {
                        return {
                            shouldShowAlert: false,
                            shouldPlaySound: false,
                            shouldSetBadge: false,
                            shouldShowBanner: false,
                            shouldShowList: false,
                        };
                    }

                    return {
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: true,
                        shouldShowBanner: true,
                        shouldShowList: true,
                    };
                },
            });

            await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

            const token = await registerForPushNotificationsAsync();
            console.log("_layout.tsx token = ", token);

            if (token) {
                await saveNotificationTokenData({ notificationPushToken: token });

                if (courier?._id) {
                    await apiService.updateData(courier._id, "notificationPushToken", token);
                }
            }

            notificationListener.current =
                Notifications.addNotificationReceivedListener(async (notification) => {
                    console.log("🔔 Notification Received: ", notification);

                    try {
                        let courierId = courier?._id;
                        if (!courier?._id) {
                            console.log("🔔 No courier ID, fetching data...");
                            const res = await apiService.getData();
                            if (res.success && res.userData) {
                                courierId = res.userData._id;
                                await updateCourierData(res.userData);
                                setCourier(res.userData);
                                console.log("🔔 Courier data updated:", res.userData);
                            } else {
                                console.error('Не удалось получить данные курьера');
                                return;
                            }
                        }

                        if (notification.request.content.title === "newOrder") {
                            console.log("🔔 New order notification received");
                            const orderData = notification.request.content.data.order as Order;
                            if (orderData) {
                                console.log("🔔 Order data:", orderData);
                                setCurrentOrder(orderData);
                                setShowNotification(true);
                                setIsOrderAccepted(false);
                            }
                        }
                    } catch (error) {
                        console.error('Ошибка обработки уведомления:', error);
                    }
                });

            responseListener.current =
                Notifications.addNotificationResponseReceivedListener((response) => {
                    console.log("🔔 Notification Response: ", response.notification.request.content);

                    const { title, data } = response.notification.request.content;

                    if (title === "newOrder" && data?.order) {
                        const orderData = data.order as Order;
                        setCurrentOrder(orderData);
                        setShowNotification(true);
                        setIsOrderAccepted(false);
                    }
                });
        };

        setupNotifications();

        return () => {
            isMounted = false;
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    const handleAcceptOrder = () => {
        if (currentOrder) {
            setIsOrderAccepted(true);
        }
    };
    
    const handleDeclineOrder = () => {
        setShowNotification(false);
        setCurrentOrder(null);
        setIsOrderAccepted(false);
    };

    const hideNotification = () => {
        setShowNotification(false);
    };

    const getNotificationToken = async () => {
        try {
            const Notifications = await loadNotifications();
            if (!Notifications) {
                return;
            }

            if (!notificationPermissionGranted) {
                const { status } = await Notifications.requestPermissionsAsync();
                console.log("_layout.tsx status = ", status);

                if (status !== 'granted') return;
            }

            const token = await registerForPushNotificationsAsync();
            console.log("_layout.tsx token = ", token);

            if (token) {
                await saveNotificationTokenData({ notificationPushToken: token });

                if (courier?._id) {
                    await apiService.updateData(courier._id, "notificationPushToken", token);
                }
            }
        } catch (error) {
            console.error('Ошибка при получении токена уведомлений:', error);
        }
    };

    useEffect(() => {
        if (courier?._id) {
            getNotificationToken();
        }
    }, [courier?._id]);

    useEffect(() => {
        if (!courier?._id) return;

        global.courierId = courier._id;
        global.isOnline = courier.onTheLine;
    }, [courier?._id, courier?.onTheLine]);

    // ЗАПУСК ОТСЛЕЖИВАНИЯ ГЕОЛОКАЦИИ (один раз на сессию курьера)
    useEffect(() => {
        if (!courier?._id) {
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
            return;
        }

        const courierId = courier._id;

        const startLocationTracking = async () => {
            console.log('🚀 Запуск отслеживания геолокации...');
            console.log('📊 Статус курьера: ID =', courierId, ', Онлайн =', global.isOnline);

            const hasPermissions = await requestPermissions();
            if (!hasPermissions) {
                console.error('❌ Нет разрешений для отслеживания геолокации');
                return;
            }

            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

            if (!hasStarted) {
                try {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: undefined,
                        distanceInterval: 1000,
                        showsBackgroundLocationIndicator: true,
                        foregroundService: {
                            notificationTitle: 'Отслеживание местоположения',
                            notificationBody: 'Местоположение отправляется каждые 1000 метров движения',
                            notificationColor: '#DC1818',
                        },
                    });

                    console.log('✅ Отслеживание геолокации запущено (каждые 1000 метров)');
                } catch (error) {
                    console.error('❌ Ошибка запуска отслеживания:', error);
                }
            } else {
                console.log('ℹ️ Отслеживание уже запущено');
            }
        };

        startLocationTracking();

        return () => {
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
        };
    }, [courier?._id]);

    if (!rootNavigationState?.key || !isInitialized) {
        return null;
    }

    return (
        <SafeAreaView style={{flex: 1}}>
            <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
                    <Stack.Screen name="start" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="otp" />
                    <Stack.Screen name="registerAccepted" />

                    <Stack.Screen name="main" />
                    <Stack.Screen name="orderStatus" />
                    <Stack.Screen name="success" />
                    <Stack.Screen name="cancelled" />
                    <Stack.Screen name="cancelledReason" />
                    <Stack.Screen name="changeOrderBottles" />

                    <Stack.Screen name="settings" />
                    <Stack.Screen name="changeData" />
                    <Stack.Screen name="analytics" />
                    
                    <Stack.Screen name="deliveredBottles" />
                    <Stack.Screen name="history" />
                    <Stack.Screen name="orderHistoryData" />
                    <Stack.Screen name="finance" />
                </Stack>
                <StatusBar style="auto" />
                {currentOrder && (
                    <OrderNotification
                        isVisible={showNotification}
                        onAccept={handleAcceptOrder}
                        onDecline={handleDeclineOrder}
                        hideNotification={hideNotification}
                        isAccepted={isOrderAccepted}
                        order={currentOrder}
                    />
                )}
            </SafeAreaProvider>
            <View style={{height: 30}}></View>
        </SafeAreaView>
    )
}