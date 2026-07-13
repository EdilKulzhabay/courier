# Приложение курьера (courier)

Expo ~54, expo-router ~6 (file-based routing), TypeScript.

## Запуск

```bash
npm start              # Expo dev server
npm run android        # Android
npm run ios            # iOS
expo run:android       # Native build Android
expo run:ios           # Native build iOS
```

## Структура

```
app/                   # Экраны (expo-router, file-based)
api/
  axios.ts             # Axios instance, JWT из AsyncStorage (@token_data)
  services.ts          # Все API-вызовы
components/            # Переиспользуемые компоненты (OrderNotification и др.)
constants/             # Константы
context/
  NotificationContext.tsx
hooks/
  useColorScheme.ts
types/
  interfaces.ts        # CourierData, Order, и др.
utils/
  storage.ts           # getCourierData, getTokenData, saveNotificationTokenData, updateCourierData
  registerForPushNotificationsAsync.ts
  notifications.ts     # isRemotePushSupported, loadNotifications
scripts/               # reset-project.js
```

## Экраны (`app/`)

| Файл | Назначение |
|------|-----------|
| `index.tsx` | Стартовый экран |
| `login.tsx` | Авторизация |
| `register.tsx` / `otp.tsx` / `registerAccepted.tsx` | Регистрация |
| `main.tsx` | Главный экран (список заказов) |
| `orderStatus.tsx` | Статус заказа |
| `orderCompletion.tsx` | Завершение заказа |
| `changeOrderBottles.tsx` | Изменение кол-ва бутылей |
| `deliveredBottles.tsx` | Подтверждение доставки |
| `cancelledReason.tsx` / `cancelled.tsx` | Отмена заказа |
| `chat.tsx` | Чат |
| `history.tsx` / `orderHistoryData.tsx` | История заказов |
| `finance.tsx` | Финансы курьера |
| `analytics.tsx` | Аналитика |
| `addressImages.tsx` | Фото адреса |
| `changeData.tsx` / `settings.tsx` | Настройки профиля |
| `success.tsx` / `start.tsx` | Служебные экраны |
| `_layout.tsx` | Root layout: геолокация, пуши, глобальный стейт |

## Root Layout (`app/_layout.tsx`) — ключевая логика

- Background location task (`background-location-task`) — фоновая отправка координат на сервер
- `global.courierId` и `global.isOnline` — глобальный стейт для фоновой задачи
- Функция `sendLocationToServer` — корректировка времени UTC+5 (Казахстан)
- Push-уведомления: `expo-notifications` + Firebase
- `expo-keep-awake` — экран не гаснет во время работы
- `SplashScreen.preventAutoHideAsync()` — контролируемое скрытие сплэша

## API

Base URL: `https://api.tibetskayacrm.kz`  
Токен: `AsyncStorage.getItem('@token_data')` → `{ token: string }` → `Authorization: Bearer <token>`

## Ключевые библиотеки

- `expo-router` ~6 — файловая маршрутизация
- `expo-location` — геолокация (foreground + background)
- `expo-notifications` + `expo-device` — пуш-уведомления
- `expo-background-fetch` / `expo-background-task` — фоновые задачи
- `expo-task-manager` — менеджер фоновых задач
- `expo-keep-awake` — предотвращение блокировки экрана
- `@react-native-community/datetimepicker` — выбор даты/времени
- `@react-navigation/bottom-tabs` — нижняя навигация
- `axios` — HTTP
- `AsyncStorage` — хранилище токена и данных курьера

## Типы (`types/interfaces.ts`)

Основные: `CourierData`, `Order`

## Важно

- Геолокация отправляется с поправкой +5 часов (UTC+5, Алматы/Астана)
- Отправка координат только когда `global.isOnline === true`
- `eas.json` — конфиг EAS Build для production/preview/development сборок
