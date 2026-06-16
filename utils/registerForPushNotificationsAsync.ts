import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { isRemotePushSupported, loadNotifications } from "./notifications";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (!isRemotePushSupported()) {
        return null;
    }

    const Notifications = await loadNotifications();
    if (!Notifications) {
        return null;
    }

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    if (!Device.isDevice) {
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        return null;
    }

    const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

    if (!projectId) {
        return null;
    }

    try {
        const pushTokenString = (
            await Notifications.getExpoPushTokenAsync({ projectId })
        ).data;
        return pushTokenString;
    } catch {
        return null;
    }
}
