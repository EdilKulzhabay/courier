import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    if (Device.isDevice) {

        console.log("we in registerForPushNotificationsAsync Device.isDevice = ", Device.isDevice);
        
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.log("finalStatus = ", finalStatus);
            throw new Error(
                "Permission not granted to get push token for push notification!"
            );
        }
        const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

        if (!projectId) {
            console.log("projectId = ", projectId);
            throw new Error("Project ID not found");
        }
        try {
            const pushTokenString = (
                await Notifications.getExpoPushTokenAsync({projectId})
            ).data;
            console.log(pushTokenString);
            return pushTokenString;
        } catch (e: unknown) {
            console.log("e = ", e);
            throw new Error(`${e}`);
        }
    } else {
        throw new Error("Must use physical device for push notifications");
    }
}