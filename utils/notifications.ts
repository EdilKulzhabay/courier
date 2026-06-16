import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

export function isRemotePushSupported(): boolean {
    return !(Platform.OS === "android" && isRunningInExpoGo());
}

export async function loadNotifications() {
    if (!isRemotePushSupported()) {
        return null;
    }

    return import("expo-notifications");
}
