import { apiService } from '@/api/services';
import OrderNotification from '@/components/OrderNotification';
import { CourierData, Order } from '@/types/interfaces';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { saveNotificationTokenData, updateCourierData } from '@/utils/storage';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView } from 'react-native';
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
        // Do something with the notification data
    }
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
            // Запрашиваем разрешения на геолокацию
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            setLocationPermissionGranted(locationStatus === 'granted');
            
            // Запрашиваем разрешения на уведомления
            const { status: notificationStatus } = await Notifications.getPermissionsAsync();
            if (notificationStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                setNotificationPermissionGranted(status === 'granted');
            } else {
                setNotificationPermissionGranted(true);
            }
            
            return locationStatus === 'granted';
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
            console.log("🔔 Notification Content: ", notification.request.content);
            console.log("🔔 Notification Data: ", notification.request.content.data);
            try {
                let courierId = await courier?._id;
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
  
                if (notification.request.content.title === "getLocation" && courierId) {
                    console.log("🔔 Get location notification received");
                    
                    try {
                        // Проверяем, есть ли разрешение на геолокацию
                        if (!locationPermissionGranted) {
                            const granted = await requestPermissions();
                            if (!granted) return;
                        }
  
                        let loc = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced
                        });
  
                        const timestamp = new Date(loc.timestamp);
                        timestamp.setHours(timestamp.getHours() + 5);
  
                        if (courierId) {
                            await apiService.updateData(courierId, "point", {
                                lat: loc.coords.latitude,
                                lon: loc.coords.longitude,
                                timestamp: timestamp
                            });
                        }
                    } catch (error) {
                        console.error('Ошибка при получении геолокации:', error);
                    }
                }
            } catch (error) {
                console.error('Ошибка обработки уведомления:', error);
            }
        });

        responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
            console.log(
            "🔔 Notification Response: ",
            JSON.stringify(response, null, 2),
            JSON.stringify(response.notification.request.content.data, null, 2)
            );
            // Handle the notification response here
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(
                notificationListener.current
                );
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
    
    const handleTimeout = () => {
        setShowNotification(false);
        setCurrentOrder(null);
        setIsOrderAccepted(false);
    };

    const hideNotification = () => {
        setShowNotification(false);
    };

    const getNotificationToken = async () => {
        try {
            // Проверяем, есть ли разрешение на уведомления
            if (!notificationPermissionGranted) {
                const { status } = await Notifications.requestPermissionsAsync();
                console.log("_layout.tsx status = ", status);
                
                if (status !== 'granted') return;
            }
            
            const token = await registerForPushNotificationsAsync();
            console.log("_layout.tsx token = ", token);
            
            if (token) {
                await saveNotificationTokenData({ notificationPushToken: token });
                
                // Обновляем токен на сервере только если есть courier._id
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
                    <Stack.Screen name="orderStatus" />
                    <Stack.Screen name="success" />
                    <Stack.Screen name="cancelled" />
                    <Stack.Screen name="cancelledReason" />

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
                      onTimeout={handleTimeout}
                      hideNotification={hideNotification}
                      isAccepted={isOrderAccepted}
                      order={currentOrder}
                  />
              )}
          </SafeAreaProvider>
      </SafeAreaView>
  )
}