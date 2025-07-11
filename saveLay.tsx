import api from '@/api/axios';
import { apiService } from '@/api/services';
import OrderNotification from '@/components/OrderNotification';
import { CourierData, Order } from '@/types/interfaces';
import { registerForPushNotificationsAsync } from '@/utils/registerForPushNotificationsAsync';
import { saveNotificationTokenData, updateCourierData } from '@/utils/storage';
import * as BackgroundTask from "expo-background-task";
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
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
        // Do something with the notification data
    }
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const LOCATION_TASK_NAME = 'background-location-task';
const TASK_NAME = 'background-console-log';
const HEARTBEAT_TASK = 'heartbeat-location-task';

declare global {
  var courierId: string | undefined;
  var lastLocationTime: number;
  var locationWatchId: number | null;
}

// Инициализируем глобальные переменные
global.lastLocationTime = 0;
global.locationWatchId = null;

// Функция для отправки геолокации (универсальная)
const sendLocationToServer = async (location: any, source: string) => {
    try {
        const courierId = global.courierId;
        if (!courierId) {
            console.warn(`⚠️ ${source}: Нет ID курьера для отправки геолокации`);
            return false;
        }

        // Корректируем время с учетом часового пояса
        const timestamp = new Date(location.timestamp);
        timestamp.setHours(timestamp.getHours() + 5);

        const locationData = {
            lat: location.coords.latitude,
            lon: location.coords.longitude,
            timestamp: timestamp,
            accuracy: location.coords.accuracy,
            source: source
        };

        console.log(`📍 ${source}: Отправляем геолокацию:`, locationData);
        
        // Отправляем геолокацию через API
        await apiService.updateData(courierId, "point", locationData);
        
        // Также отправляем лог для отслеживания
        const logText = `[${new Date().toISOString()}] ${source}: геолокация отправлена (${locationData.lat}, ${locationData.lon}), точность: ${locationData.accuracy}м`;
        const data = { text: logText };
        await api.post('/courierAggregatorTestLog', data);
        
        // Обновляем время последней отправки
        global.lastLocationTime = Date.now();
        
        console.log(`✅ ${source}: Геолокация успешно отправлена`);
        return true;
    } catch (error) {
        console.error(`❌ ${source}: Ошибка отправки геолокации:`, error);
        
        // Отправляем лог об ошибке
        try {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            const errorText = `[${new Date().toISOString()}] ${source}: Ошибка отправки: ${errorMessage}`;
            const data = { text: errorText };
            await api.post('/courierAggregatorTestLog', data);
        } catch (logError) {
            console.error(`❌ ${source}: Не удалось отправить лог ошибки:`, logError);
        }
        
        return false;
    }
};

// Функция получения геолокации с каскадной точностью
const getLocationWithFallback = async (source: string) => {
    // 1. ПРОВЕРЯЕМ СЛУЖБЫ ГЕОЛОКАЦИИ
    const isLocationEnabled = await Location.hasServicesEnabledAsync();
    if (!isLocationEnabled) {
        console.warn(`⚠️ ${source}: Службы геолокации отключены на устройстве`);
        const data = { text: `[${new Date().toISOString()}] ${source}: Службы геолокации отключены` };
        await api.post('/courierAggregatorTestLog', data);
        throw new Error('Службы геолокации отключены');
    }

    // 2. ПРОВЕРЯЕМ РАЗРЕШЕНИЯ
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
        console.warn(`⚠️ ${source}: Нет разрешения на геолокацию`);
        const data = { text: `[${new Date().toISOString()}] ${source}: Нет разрешения на геолокацию` };
        await api.post('/courierAggregatorTestLog', data);
        throw new Error('Нет разрешения на геолокацию');
    }

    // 3. ПРОБУЕМ ПОЛУЧИТЬ ПОСЛЕДНЮЮ ИЗВЕСТНУЮ ПОЗИЦИЮ
    let lastKnownLocation = null;
    try {
        lastKnownLocation = await Location.getLastKnownPositionAsync({
            maxAge: 5 * 60 * 1000, // 5 минут
            requiredAccuracy: 1000, // 1км точность
        });
        
        if (lastKnownLocation) {
            console.log(`📍 ${source}: Используем последнюю известную позицию`);
            // Проверяем, не слишком ли старая позиция
            const locationAge = Date.now() - lastKnownLocation.timestamp;
            if (locationAge < 10 * 60 * 1000) { // Если позиция моложе 10 минут
                console.log(`✅ ${source}: Последняя известная позиция подходит (возраст: ${Math.round(locationAge / 60000)} мин)`);
                return lastKnownLocation;
            }
        }
    } catch (lastKnownError) {
        console.warn(`⚠️ ${source}: Не удалось получить последнюю известную позицию:`, lastKnownError);
    }

    // 4. ПРОБУЕМ ПОЛУЧИТЬ ТЕКУЩУЮ ГЕОЛОКАЦИЮ С РАЗНЫМИ НАСТРОЙКАМИ
    const attempts = [
        {
            name: 'высокая точность',
            options: { accuracy: Location.Accuracy.High }
        },
        {
            name: 'сбалансированная точность',
            options: { accuracy: Location.Accuracy.Balanced }
        },
        {
            name: 'низкая точность',
            options: { accuracy: Location.Accuracy.Low }
        },
        {
            name: 'самая низкая точность',
            options: { accuracy: Location.Accuracy.Lowest }
        }
    ];

    for (const attempt of attempts) {
        try {
            console.log(`🔄 ${source}: Пробуем ${attempt.name}...`);
            const location = await Location.getCurrentPositionAsync(attempt.options);
            console.log(`✅ ${source}: Получена геолокация через ${attempt.name}`);
            return location;
        } catch (error) {
            console.warn(`⚠️ ${source}: ${attempt.name} недоступна:`, error);
            
            // Если это последняя попытка и у нас есть старая позиция - используем её
            if (attempt === attempts[attempts.length - 1] && lastKnownLocation) {
                console.log(`📍 ${source}: Используем старую позицию как последний резерв`);
                const locationAge = Date.now() - lastKnownLocation.timestamp;
                console.log(`⚠️ ${source}: Внимание! Позиция устарела на ${Math.round(locationAge / 60000)} минут`);
                
                // Отправляем предупреждение о старой позиции
                const warningText = `[${new Date().toISOString()}] ${source}: Используется устаревшая позиция (${Math.round(locationAge / 60000)} мин)`;
                const warningData = { text: warningText };
                await api.post('/courierAggregatorTestLog', warningData);
                
                return lastKnownLocation;
            }
        }
    }

    // 5. ЕСЛИ ВСЕ МЕТОДЫ НЕ СРАБОТАЛИ
    const errorText = `[${new Date().toISOString()}] ${source}: ВСЕ МЕТОДЫ ГЕОЛОКАЦИИ НЕДОСТУПНЫ`;
    const errorData = { text: errorText };
    await api.post('/courierAggregatorTestLog', errorData);
    
    throw new Error('Все методы получения геолокации недоступны');
};


// 2. ДОПОЛНИТЕЛЬНАЯ ФОНОВАЯ ЗАДАЧА (BackgroundTask)
TaskManager.defineTask(TASK_NAME, async () => {
    try {
        console.log('🔄 ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Запущена');
        
        const location = await getLocationWithFallback('ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА');
        await sendLocationToServer(location, 'ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА');
        
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
        console.error('❌ ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Ошибка:', error);
        
        // Запускаем диагностику при ошибках геолокации
        if (error instanceof Error && error.message.includes('location')) {
            console.log('🔍 ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА: Запускаем диагностику из-за ошибки геолокации...');
            setTimeout(async () => {
                await diagnoseLocationIssues();
            }, 1000); // Задержка чтобы не блокировать основную задачу
        }
        
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

// 3. HEARTBEAT ЗАДАЧА (проверка активности)
TaskManager.defineTask(HEARTBEAT_TASK, async () => {
    try {
        console.log('💓 HEARTBEAT: Проверка активности системы геолокации');
        
        const now = Date.now();
        const timeSinceLastLocation = now - global.lastLocationTime;
        const fiveMinutes = 5 * 60 * 1000;
        
        // Если прошло больше 7 минут с последней отправки - принудительно отправляем
        if (timeSinceLastLocation > fiveMinutes + 2 * 60 * 1000) {
            console.log('⚠️ HEARTBEAT: Давно не было геолокации, принудительно отправляем');
            
            try {
                const location = await getLocationWithFallback('HEARTBEAT');
                await sendLocationToServer(location, 'HEARTBEAT');
            } catch (error) {
                console.error('❌ HEARTBEAT: Не удалось получить геолокацию:', error);
            }
        } else {
            console.log('✅ HEARTBEAT: Система геолокации работает нормально');
        }
        
        // Отправляем статус системы
        const statusText = `[${new Date().toISOString()}] HEARTBEAT: Система активна, последняя геолокация ${Math.round(timeSinceLastLocation / 1000)} сек назад`;
        const data = { text: statusText };
        await api.post('/courierAggregatorTestLog', data);
        
        return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
        console.error('❌ HEARTBEAT: Ошибка:', error);
        return BackgroundTask.BackgroundTaskResult.Failed;
    }
});

// 4. ФУНКЦИЯ ДЛЯ НЕПРЕРЫВНОГО ОТСЛЕЖИВАНИЯ (watchPosition)
const startContinuousLocationTracking = async () => {
    try {
        console.log('🎯 НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ: Запуск');
        
        // Останавливаем предыдущее отслеживание если есть
        if (global.locationWatchId) {
            await Location.stopLocationUpdatesAsync('continuous-tracking');
            global.locationWatchId = null;
        }
        
        // Запускаем непрерывное отслеживание
        await Location.startLocationUpdatesAsync('continuous-tracking', {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5 * 60 * 1000, // 5 минут
            distanceInterval: 50, // Каждые 50 метров
        });
        
        console.log('✅ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ: Запущено успешно');
        
    } catch (error) {
        console.error('❌ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ: Ошибка запуска:', error);
    }
};

// Задача для непрерывного отслеживания
TaskManager.defineTask('continuous-tracking', async ({ data, error }) => {
    if (error) {
        console.error('❌ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ: Ошибка:', error);
        return;
    }
    
    if (data) {
        const { locations } = data as any;
        if (locations && locations.length > 0) {
            const loc = locations[0];
            console.log('📍 НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ: Новая позиция получена');
            await sendLocationToServer(loc, 'НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ');
        }
    }
});

// 5. ФУНКЦИЯ ТЕСТИРОВАНИЯ ВСЕХ МЕТОДОВ
const testAllLocationMethods = async () => {
    try {
        console.log('🧪 ТЕСТ ВСЕХ МЕТОДОВ: Начинаем комплексное тестирование');
        
        const location = await getLocationWithFallback('ТЕСТ ВСЕХ МЕТОДОВ');
        await sendLocationToServer(location, 'ТЕСТ ВСЕХ МЕТОДОВ');
        
        console.log('✅ ТЕСТ ВСЕХ МЕТОДОВ: Успешно завершен');
        return true;
    } catch (error) {
        console.error('❌ ТЕСТ ВСЕХ МЕТОДОВ: Ошибка:', error);
        return false;
    }
};

// Функция диагностики проблем с геолокацией
const diagnoseLocationIssues = async () => {
    try {
        console.log('🔍 ДИАГНОСТИКА: Начинаем проверку системы геолокации...');
        
        const diagnostics = {
            servicesEnabled: false,
            foregroundPermission: 'unknown',
            backgroundPermission: 'unknown',
            lastKnownLocation: null as string | null,
            providerStatus: 'unknown',
            timestamp: new Date().toISOString()
        };

        // 1. Проверяем службы геолокации
        diagnostics.servicesEnabled = await Location.hasServicesEnabledAsync();
        console.log('🔍 ДИАГНОСТИКА: Службы геолокации включены:', diagnostics.servicesEnabled);

        // 2. Проверяем разрешения переднего плана
        const fgPermissions = await Location.getForegroundPermissionsAsync();
        diagnostics.foregroundPermission = fgPermissions.status;
        console.log('🔍 ДИАГНОСТИКА: Разрешение переднего плана:', fgPermissions.status);

        // 3. Проверяем разрешения фона
        const bgPermissions = await Location.getBackgroundPermissionsAsync();
        diagnostics.backgroundPermission = bgPermissions.status;
        console.log('🔍 ДИАГНОСТИКА: Разрешение фона:', bgPermissions.status);

        // 4. Проверяем провайдера геолокации
        try {
            const providerStatus = await Location.getProviderStatusAsync();
            diagnostics.providerStatus = JSON.stringify(providerStatus);
            console.log('🔍 ДИАГНОСТИКА: Статус провайдера:', providerStatus);
        } catch (providerError) {
            console.warn('🔍 ДИАГНОСТИКА: Не удалось получить статус провайдера:', providerError);
        }

        // 5. Проверяем последнюю известную позицию
        try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                const age = Date.now() - lastKnown.timestamp;
                diagnostics.lastKnownLocation = `Есть (возраст: ${Math.round(age / 60000)} мин)`;
                console.log('🔍 ДИАГНОСТИКА: Последняя известная позиция:', diagnostics.lastKnownLocation);
            } else {
                diagnostics.lastKnownLocation = 'Отсутствует';
                console.log('🔍 ДИАГНОСТИКА: Последняя известная позиция отсутствует');
            }
        } catch (lastKnownError) {
            const errorMessage = lastKnownError instanceof Error ? lastKnownError.message : 'Неизвестная ошибка';
            diagnostics.lastKnownLocation = `Ошибка: ${errorMessage}`;
            console.warn('🔍 ДИАГНОСТИКА: Ошибка получения последней позиции:', lastKnownError);
        }

        // 6. Отправляем полный отчет диагностики
        const diagnosticReport = `[${diagnostics.timestamp}] ДИАГНОСТИКА ГЕОЛОКАЦИИ:
- Службы включены: ${diagnostics.servicesEnabled}
- Разрешение переднего плана: ${diagnostics.foregroundPermission}
- Разрешение фона: ${diagnostics.backgroundPermission}
- Последняя позиция: ${diagnostics.lastKnownLocation}
- Провайдер: ${diagnostics.providerStatus}`;

        const data = { text: diagnosticReport };
        await api.post('/courierAggregatorTestLog', data);
        
        console.log('✅ ДИАГНОСТИКА: Отчет отправлен на сервер');
        return diagnostics;
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        console.error('❌ ДИАГНОСТИКА: Ошибка при диагностике:', error);
        
        const errorReport = `[${new Date().toISOString()}] ОШИБКА ДИАГНОСТИКИ: ${errorMessage}`;
        const errorData = { text: errorReport };
        await api.post('/courierAggregatorTestLog', errorData);
        
        return null;
    }
};

export default function RootLayout() {
    // Предотвращаем затухание экрана когда приложение открыто
    useKeepAwake();

    const router = useRouter()
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

    // useEffect(() => {
    //     const init = async () => {
    //       try {
    //         const status = await BackgroundTask.getStatusAsync();
    //         console.log('📱 BackgroundTask статус:', status);
            
    //         if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    //             console.warn('⚠️ Фоновые задачи недоступны. Статус:', status);
    //             return;
    //         }
      
    //         const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    //         console.log('📋 Задача уже зарегистрирована:', isRegistered);
            
    //         if (!isRegistered) {
    //             await BackgroundTask.registerTaskAsync(TASK_NAME, {
    //               minimumInterval: 5 * 60, // 5 минут
    //             });
    //             console.log('✅ Фоновая задача зарегистрирована с интервалом 5 минут');
    //         } else {
    //             console.log('ℹ️ Фоновая задача уже была зарегистрирована ранее');
    //         }

    //         // Тестируем задачу вручную для проверки
    //         console.log('🧪 Тестируем фоновую задачу вручную...');
    //         try {
    //             // Проверяем доступность геолокации
    //             const { status } = await Location.requestForegroundPermissionsAsync();
    //             if (status === 'granted') {
    //                 const location = await Location.getCurrentPositionAsync({
    //                     accuracy: Location.Accuracy.Balanced,
    //                 });
    //                 console.log('📍 Тестовая геолокация получена:', {
    //                     lat: location.coords.latitude,
    //                     lon: location.coords.longitude,
    //                     accuracy: location.coords.accuracy
    //                 });
                    
    //                 const data = {
    //                     lat: location.coords.latitude,
    //                     lon: location.coords.longitude,
    //                     accuracy: location.coords.accuracy,
    //                     text: 'Тестовый запуск фоновой задачи - геолокация доступна ' + new Date().toISOString()
    //                 }
    //                 await api.post('/courierAggregatorTestLog', data);
    //                 console.log('✅ Тестовый запрос успешен - геолокация работает');

    //                 // Тестируем фоновую задачу вручную (только в режиме разработки)
    //                 console.log('🧪 Запускаем фоновую задачу для тестирования...');
    //                 console.log('⚠️ ВАЖНО: Фоновые задачи НЕ работают когда приложение активно!');
    //                 console.log('📱 Для тестирования: сверните приложение и подождите 5-15 минут');
                    
    //                 const testResult = await BackgroundTask.triggerTaskWorkerForTestingAsync();
    //                 console.log('🧪 Результат тестирования фоновой задачи:', testResult);
                    
    //                 if (testResult === null) {
    //                     console.log('⚠️ Задача не запустилась - это нормально для активного приложения');
    //                     console.log('✨ Сверните приложение для реального тестирования фоновых задач');
    //                 }
    //             } else {
    //                 console.warn('⚠️ Нет разрешения на геолокацию для тестирования');
    //                 const data = {
    //                     text: 'Тестовый запуск фоновой задачи - нет разрешения на геолокацию ' + new Date().toISOString()
    //                 }
    //                 await api.post('/courierAggregatorTestLog', data);
    //             }
    //         } catch (testError) {
    //             console.error('❌ Ошибка при тестовом запросе:', testError);
    //             const errorMessage = testError instanceof Error ? testError.message : 'Неизвестная ошибка';
    //             const data = {
    //                 text: 'Тестовый запуск фоновой задачи - ошибка ' + new Date().toISOString() + ' ' + errorMessage
    //             }
    //             await api.post('/courierAggregatorTestLog', data);
    //         }
    //       } catch (error) {
    //         console.error('❌ Ошибка при инициализации фоновой задачи:', error);
    //       }
    //     };
    
    //     init();
    //   }, []);

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
  
                // if (notification.request.content.title === "getLocation" && courierId) {
                //     console.log("🔔 Get location notification received");
                    
                //     try {
                //         // Проверяем, есть ли разрешение на геолокацию
                //         if (!locationPermissionGranted) {
                //             const granted = await requestPermissions();
                //             if (!granted) return;
                //         }
  
                //         let loc = await Location.getCurrentPositionAsync({
                //             accuracy: Location.Accuracy.Balanced
                //         });
  
                //         const timestamp = new Date(loc.timestamp);
                //         timestamp.setHours(timestamp.getHours() + 5);
  
                //         if (courierId) {
                //             await apiService.updateData(courierId, "point", {
                //                 lat: loc.coords.latitude,
                //                 lon: loc.coords.longitude,
                //                 timestamp: timestamp
                //             });
                //         }
                //     } catch (error) {
                //         console.error('Ошибка при получении геолокации:', error);
                //     }
                // }
            } catch (error) {
                console.error('Ошибка обработки уведомления:', error);
            }
        });

        responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
            console.log(
                "🔔 Notification Response: ", response.notification.request.content
            );
            
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

    useEffect(() => {
        console.log("we in 327 line, courier._id = ", courier?._id);
        
        if (!courier?._id) return;
        global.courierId = courier._id;
        
        const startLocationUpdates = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            
            // 1. ЗАПУСКАЕМ ОСНОВНУЮ ЗАДАЧУ ГЕОЛОКАЦИИ
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log("we in 335 line, hasStarted = ", hasStarted);
            
            if (!hasStarted) {
                const fg = await Location.requestForegroundPermissionsAsync();
                const bg = await Location.requestBackgroundPermissionsAsync();
                console.log("Permissions: FG =", fg.status, ", BG =", bg.status);
                await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, 
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5 * 60 * 1000, // 5 минут
                        distanceInterval: 0,
                        showsBackgroundLocationIndicator: true,
                        foregroundService: {
                            notificationTitle: 'Отслеживание местоположения',
                            notificationBody: 'Ваше местоположение отправляется для доставки заказов',
                            notificationColor: '#DC1818',
                        },
                    }
                );
                console.log("✅ ОСНОВНАЯ ЗАДАЧА: Location updates started!");
            }
            
            // 2. ДОПОЛНИТЕЛЬНО ЗАПУСКАЕМ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ
            console.log("🎯 Запускаем дополнительное непрерывное отслеживание...");
            await startContinuousLocationTracking();
            
            // 3. ОТПРАВЛЯЕМ СТАТУС ЗАПУСКА
            try {
                const statusText = `[${new Date().toISOString()}] КУРЬЕР АКТИВЕН: ID=${courier._id}, все системы геолокации запущены`;
                const data = { text: statusText };
                await api.post('/courierAggregatorTestLog', data);
                console.log("✅ Статус активации курьера отправлен на сервер");
            } catch (error) {
                console.error("❌ Ошибка отправки статуса активации:", error);
            }
        };
        
        startLocationUpdates();
        
        return () => {
            // Можно остановить задачи при необходимости:
            // Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            // Location.stopLocationUpdatesAsync('continuous-tracking');
        };
    }, [courier?._id]);

    // Инициализация фоновой задачи
    useEffect(() => {
        const initBackgroundTask = async () => {
            try {
                console.log('🔄 Инициализация КОМПЛЕКСНОЙ СИСТЕМЫ геолокации...');
                
                // Проверяем разрешения на геолокацию
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.warn('⚠️ Разрешение на геолокацию не предоставлено');
                    return;
                }
                
                // 1. РЕГИСТРИРУЕМ ОСНОВНУЮ ДОПОЛНИТЕЛЬНУЮ ЗАДАЧУ
                console.log('📝 Регистрируем дополнительную фоновую задачу...');
                await BackgroundTask.registerTaskAsync(TASK_NAME, {
                    minimumInterval: 5 * 60 * 1000, // 5 минут
                });
                console.log('✅ Дополнительная фоновая задача зарегистрирована');
                
                // 2. РЕГИСТРИРУЕМ HEARTBEAT ЗАДАЧУ
                console.log('📝 Регистрируем heartbeat задачу...');
                await BackgroundTask.registerTaskAsync(HEARTBEAT_TASK, {
                    minimumInterval: 3 * 60 * 1000, // 3 минуты (чаще чем основная)
                });
                console.log('✅ Heartbeat задача зарегистрирована');
                
                // 3. ЗАПУСКАЕМ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ
                console.log('📝 Запускаем непрерывное отслеживание...');
                await startContinuousLocationTracking();
                
                // 4. ТЕСТИРУЕМ ВСЕ МЕТОДЫ В РЕЖИМЕ РАЗРАБОТКИ
                if (__DEV__) {
                    console.log('🧪 Запускаем комплексное тестирование всех методов...');
                    setTimeout(async () => {
                        const result = await testAllLocationMethods();
                        console.log('🧪 Результат комплексного тестирования:', result ? 'Успешно' : 'Ошибка');
                        
                        // Отправляем статус системы
                        const statusText = `[${new Date().toISOString()}] СИСТЕМА ЗАПУЩЕНА: Все ${result ? '5' : '4'} методов отслеживания инициализированы`;
                        const data = { text: statusText };
                        await api.post('/courierAggregatorTestLog', data);
                    }, 3000); // Задержка 3 секунды
                }
                
                console.log('🎯 КОМПЛЕКСНАЯ СИСТЕМА геолокации полностью инициализирована!');
                console.log('📊 Активные методы отслеживания:');
                console.log('   1️⃣ ОСНОВНАЯ ЗАДАЧА (TaskManager) - каждые 5 мин');
                console.log('   2️⃣ ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА (BackgroundTask) - каждые 5 мин');
                console.log('   3️⃣ HEARTBEAT (контроль) - каждые 3 мин');
                console.log('   4️⃣ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ - по движению');
                console.log('   5️⃣ ТЕСТИРОВАНИЕ - по требованию');
                
            } catch (error) {
                console.error('❌ Ошибка инициализации комплексной системы геолокации:', error);
                
                // Отправляем лог об ошибке инициализации
                try {
                    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                    const errorText = `[${new Date().toISOString()}] ОШИБКА ИНИЦИАЛИЗАЦИИ СИСТЕМЫ: ${errorMessage}`;
                    const data = { text: errorText };
                    await api.post('/courierAggregatorTestLog', data);
                } catch (logError) {
                    console.error('❌ Не удалось отправить лог ошибки инициализации:', logError);
                }
            }
        };
        
        initBackgroundTask();
    }, []);

    // Тестирование фоновой задачи
    const triggerTaskWorkerForTestingAsync = async () => {
        try {
            console.log('⚠️ ВАЖНО: Фоновые задачи НЕ РАБОТАЮТ когда приложение активно!');
            console.log('📱 Для тестирования: сверните приложение и подождите 5-15 минут');
            console.log('🧪 Запускаем прямое тестирование ВСЕХ методов геолокации...');
            
            // Запускаем тестирование всех методов
            const result = await testAllLocationMethods();
            console.log('🧪 Результат прямого тестирования всех методов:', result ? 'Успешно' : 'Ошибка');
            
            // Дополнительно проверяем статус системы
            const now = Date.now();
            const timeSinceLastLocation = now - global.lastLocationTime;
            console.log(`📊 Статус системы: последняя геолокация ${Math.round(timeSinceLastLocation / 1000)} секунд назад`);
            
        } catch (error) {
            console.error('❌ Ошибка тестирования комплексной системы:', error);
        }
    };

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
                        onTimeout={handleTimeout}
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