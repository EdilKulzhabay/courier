import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
    View,
    Text,
    Image,
    StyleSheet,
    Platform,
    TouchableOpacity,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    Alert,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiService } from "../api/services";
import { loadNotifications } from "@/utils/notifications";
import { OrderChatMessage } from "@/types/interfaces";

const OrderChat = () => {
    const { orderId, clientTitle } = useLocalSearchParams();
    const router = useRouter();
    const [messages, setMessages] = useState<OrderChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList>(null);

    const getMessages = async (silent = false) => {
        if (!orderId) return;
        const res = await apiService.getOrderChatMessages(orderId as string);
        if (res.success) {
            setMessages(res.messages as OrderChatMessage[]);
        } else if (!silent) {
            Alert.alert("Ошибка", res.message || "Не удалось загрузить сообщения");
        }
    };

    // Пуш-уведомления доходят не всегда (фон/просрочен токен), поэтому
    // подстраховываемся обновлением при открытии/возврате на экран и по таймеру.
    useFocusEffect(
        useCallback(() => {
            getMessages();
            const interval = setInterval(() => getMessages(true), 5000);
            return () => clearInterval(interval);
        }, [orderId])
    );

    useEffect(() => {
        let subscription: { remove: () => void } | null = null;

        const setupListener = async () => {
            const Notifications = await loadNotifications();
            if (!Notifications) return;

            subscription = Notifications.addNotificationReceivedListener((notification) => {
                const data = notification.request.content.data as any;
                if (data?.newStatus !== "newOrderChatMessage" || data?.orderId !== orderId) {
                    return;
                }
                try {
                    const newMessage = typeof data.message === "string" ? JSON.parse(data.message) : data.message;
                    setMessages((prev) => {
                        const exists = prev.some(
                            (msg) => msg._id === newMessage._id || (msg.text === newMessage.text && msg.timestamp === newMessage.timestamp)
                        );
                        if (exists) return prev;
                        return [...prev, newMessage];
                    });
                } catch (e) {
                    console.log("Ошибка обработки сообщения чата:", e);
                }
            });
        };

        setupListener();

        return () => {
            subscription?.remove();
        };
    }, [orderId]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    const sendMessage = async () => {
        if (!inputText.trim() || !orderId) return;
        Keyboard.dismiss();
        const text = inputText.trim();
        setInputText("");

        const res = await apiService.sendOrderChatMessage(orderId as string, text);
        if (res.success) {
            setMessages(res.messages as OrderChatMessage[]);
        } else {
            Alert.alert("Ошибка", res.message || "Не удалось отправить сообщение");
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{clientTitle ? `Чат с ${clientTitle}` : "Чат с клиентом"}</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item, index) => item._id || `message-${index}`}
                    contentContainerStyle={styles.messagesContent}
                    renderItem={({ item }) => {
                        const isCourier = item.sender === "courier";
                        return (
                            <View style={[styles.messageContainer, isCourier ? styles.courierMessage : styles.clientMessage]}>
                                <View style={[styles.bubble, isCourier ? styles.courierBubble : styles.clientBubble]}>
                                    <Text style={[styles.messageText, isCourier ? styles.courierMessageText : styles.clientMessageText]}>
                                        {item.text}
                                    </Text>
                                </View>
                                <Text style={styles.timestamp}>
                                    {new Date(item.timestamp).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                </Text>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Нет сообщений</Text>
                        </View>
                    }
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Напишите что-то..."
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Text style={styles.sendIcon}>➤</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
        ...Platform.select({
            android: { paddingTop: 38 },
            ios: {},
        }),
    },
    header: {
        flexDirection: "row",
        backgroundColor: "white",
        alignItems: "center",
        padding: 24,
    },
    backButton: {
        padding: 8,
        backgroundColor: "#EFEFEF",
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "500",
        marginLeft: 16,
        color: "#292D32",
    },
    content: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    messagesContent: {
        padding: 16,
        flexGrow: 1,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: "80%",
    },
    courierMessage: {
        alignSelf: "flex-end",
        alignItems: "flex-end",
    },
    clientMessage: {
        alignSelf: "flex-start",
        alignItems: "flex-start",
    },
    bubble: {
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    courierBubble: {
        backgroundColor: "#0054d5",
        borderBottomRightRadius: 4,
    },
    clientBubble: {
        backgroundColor: "white",
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    courierMessageText: {
        color: "white",
    },
    clientMessageText: {
        color: "#333",
    },
    timestamp: {
        fontSize: 11,
        color: "#999",
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#999",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 16,
        backgroundColor: "white",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#E3E3E3",
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: "#333",
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#0054d5",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: "#CCCCCC",
        opacity: 0.5,
    },
    sendIcon: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
        marginLeft: 4,
    },
});

export default OrderChat;
