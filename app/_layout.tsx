import { apiService } from '@/api/services';
import OrderNotification from '@/components/OrderNotification';
import { CourierData, Order } from '@/types/interfaces';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { saveNotificationTokenData, updateCourierData } from '@/utils/storage';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

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

        console.log(`📍 ${source}: Отправляем геолокацию:`, locationData);
        
        // Отправляем геолокацию через API
        await apiService.updateData(courierId, "point", locationData);
        
        console.log(`✅ ${source}: Геолокация успешно отправлена`);
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
            console.log('📍 ОСНОВНАЯ ЗАДАЧА: Новая позиция при движении');
            
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
    // Предотвращаем затухание экрана когда приложение открыто
    useKeepAwake();

    const [courier, setCourier] = useState<CourierData | null>(null);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [showNotification, setShowNotification] = useState(false);
    const [isOrderAccepted, setIsOrderAccepted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
    const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);

    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    const [initialRoute, setInitialRoute] = useState<"start" | "main">("start");

    useEffect(() => {
        SplashScreen.hideAsync();
    }, []);

    const fetchCourierData = async () => {
        try {
            const res = await apiService.getData();
            if (res.success && res.userData) {
                setInitialRoute(res.success ? "main" : "start");
                await updateCourierData(res.userData);
                setCourier(res.userData);
                return res.userData._id;
            }
            return null;
        } catch (error) {
            console.error('Ошибка при получении данных курьера:', error);
            Alert.alert('Ошибка', 'Не удалось получить данные курьера');
            return null;
        }
    };

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
            const { status: notificationStatus } = await Notifications.getPermissionsAsync();
            if (notificationStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                console.log('🔔 Разрешение на уведомления:', status);
                setNotificationPermissionGranted(status === 'granted');
            } else {
                setNotificationPermissionGranted(true);
            }
            
            console.log('✅ Все разрешения обработаны');
            return fgLocationStatus === 'granted';
        } catch (error) {
            console.error('Ошибка при запросе разрешений:', error);
            return false;
        }
    };

    useEffect(() => {
        const getToken = async () => {
            const token = await registerForPushNotificationsAsync();
            console.log("_layout.tsx token = ", token);

            if (token) {
                await saveNotificationTokenData({ notificationPushToken: token });
                
                // Обновляем токен на сервере только если есть courier._id
                if (courier?._id) {
                    await apiService.updateData(courier._id, "notificationPushToken", token);
                }
            }
        }

        getToken();

        notificationListener.current =
        Notifications.addNotificationReceivedListener( async (notification) => {
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

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
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
        fetchCourierData();
    }, []);

    useEffect(() => {
        if (courier?._id) {
            getNotificationToken();
        }
    }, [courier?._id]);

    // ЗАПУСК ОТСЛЕЖИВАНИЯ ГЕОЛОКАЦИИ
    useEffect(() => {
        if (!courier?._id) return;
        
        global.courierId = courier._id;
        global.isOnline = courier.onTheLine; // Устанавливаем онлайн статус
        
        const startLocationTracking = async () => {
            console.log('🚀 Запуск отслеживания геолокации...');
            console.log('📊 Статус курьера: ID =', courier._id, ', Онлайн =', courier.onTheLine);
            
            // Запрашиваем все необходимые разрешения
            const hasPermissions = await requestPermissions();
            if (!hasPermissions) {
                console.error('❌ Нет разрешений для отслеживания геолокации');
                return;
            }
            
            // Проверяем, не запущено ли уже отслеживание
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            
            if (!hasStarted) {
                try {
                    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: undefined, // Убираем временной интервал
                        distanceInterval: 1000, // Каждые 1000 метров
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
            // Очистка при размонтировании компонента
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(console.error);
        };
    }, [courier?._id, courier?.onTheLine]); // Добавляем зависимость от onTheLine

    return (
        <SafeAreaView style={{flex: 1}}>
            <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                    <Stack.Screen name="start" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="otp" />
                    <Stack.Screen name="registerAccepted" />

                    <Stack.Screen name="main" />
                    <Stack.Screen name="map" />
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