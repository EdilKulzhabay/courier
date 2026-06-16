import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { loadNotifications } from "@/utils/notifications";
import type { Notification } from "expo-notifications";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

interface NotificationContextType {
    expoPushToken: string | null;
    notification: Notification | null;
    error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error(
            "useNotification must be used within a NotificationProvider"
        );
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
    children,
}) => {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notification | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const notificationListener = useRef<{ remove: () => void } | null>(null);
    const responseListener = useRef<{ remove: () => void } | null>(null);

    useEffect(() => {
        let isMounted = true;

        const setupNotifications = async () => {
            const Notifications = await loadNotifications();
            if (!Notifications || !isMounted) {
                return;
            }

            registerForPushNotificationsAsync().then(
                (token) => setExpoPushToken(token),
                (setupError) => setError(setupError)
            );

            notificationListener.current =
                Notifications.addNotificationReceivedListener((receivedNotification) => {
                    console.log("🔔 Notification Received: ", receivedNotification);
                    setNotification(receivedNotification);
                });

            responseListener.current =
                Notifications.addNotificationResponseReceivedListener((response) => {
                    console.log(
                        "🔔 Notification Response: ",
                        JSON.stringify(response, null, 2),
                        JSON.stringify(response.notification.request.content.data, null, 2)
                    );
                });
        };

        setupNotifications();

        return () => {
            isMounted = false;
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{ expoPushToken, notification, error }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
