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
    Keyboard,
    Alert,
    Modal,
    ScrollView,
    Pressable,
    Linking,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiService } from "../api/services";
import { loadNotifications } from "@/utils/notifications";
import { OrderChatMessage } from "@/types/interfaces";
import MyButton from "@/components/MyButton";

const quickMessages = {
    onTheWay: [
        "Выехал к вам", "Буду через 5 минут", "Буду через 10 минут", "Буду через 15 минут"
    ],
    atTheClient: [
        "Я на месте", "Спускайтесь, пожалуйста", "Откройте подьезд", "Откройте шлагбаум", "Не могу дозвониться"
    ],
    delivered: [
        "Проверьте количество бутылей", "Подготовьте пустые бутыли", "Подготовьте оплату", "Покажу QR для оплаты"
    ],
    problems: [
        "Не могу найти адрес", "Не могу найти подьезд", "Никого нет дома", "Не могу дозвониться"
    ],
}

const OrderChat = () => {
    const { orderId, clientTitle, currentPhone: currentPhoneParam } = useLocalSearchParams();
    const router = useRouter();
    const [messages, setMessages] = useState<OrderChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList>(null);
    const [communicationMethod, setCommunicationMethod] = useState<string>("phone");
    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
    const [quickMessagesVisible, setQuickMessagesVisible] = useState(false);

    const currentPhone = useMemo(() => {
        try {
            const parsed = JSON.parse((currentPhoneParam as string) || "[]");
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    }, [currentPhoneParam]);

    const normalizePhoneForWhatsApp = (phone: string): string => {
        // Убираем все пробелы, дефисы, скобки и другие символы форматирования
        let normalized = phone.replace(/[\s\-\(\)]/g, '');

        // Если начинается с +7, убираем +
        if (normalized.startsWith('+7')) {
            normalized = normalized.substring(1);
        }
        // Если начинается с 8, заменяем на 7
        else if (normalized.startsWith('8')) {
            normalized = '7' + normalized.substring(1);
        }
        // Если начинается с 7, оставляем как есть

        return normalized;
    };

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

    const pickQuickMessage = (text: string) => {
        setInputText(text);
        setQuickMessagesVisible(false);
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
                <TouchableOpacity
                    onPress={() => {
                        if (currentPhone.length === 1) {
                            Linking.openURL(`tel:${currentPhone[0]}`);
                        }
                        if (currentPhone.length > 1) {
                            setCommunicationMethod("phone");
                            setIsPhoneModalVisible(true);
                        }
                        if (currentPhone.length === 0) {
                            Alert.alert('Ошибка', 'У клиента нет номеров телефона');
                        }
                    }}
                    style={{marginLeft: "auto", padding: 16, backgroundColor: '#f9f9fb', borderRadius: 100, alignItems: 'center', justifyContent: 'center'}}>
                    <Image source={require("../assets/images/call.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        if (currentPhone.length === 1) {
                            const normalizedPhone = normalizePhoneForWhatsApp(currentPhone[0]);
                            Linking.openURL(`https://wa.me/${normalizedPhone}`);
                        }
                        if (currentPhone.length > 1) {
                            setCommunicationMethod("whatsapp");
                            setIsPhoneModalVisible(true);
                        }
                        if (currentPhone.length === 0) {
                            Alert.alert('Ошибка', 'У клиента нет номеров телефона');
                        }
                    }}
                    style={{marginLeft: 8, padding: 16, backgroundColor: '#f9f9fb', borderRadius: 100, alignItems: 'center', justifyContent: 'center'}}>
                    <Image source={require("../assets/images/whatsapp.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === "ios" ? 30 : 20}
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
                    <TouchableOpacity
                        style={styles.quickMessagesButton}
                        onPress={() => setQuickMessagesVisible(true)}
                    >
                        <Text style={styles.quickMessagesButtonIcon}>⚡</Text>
                    </TouchableOpacity>
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

            <Modal
                visible={isPhoneModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPhoneModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {currentPhone.map((phone, index) => (
                            <View key={index} style={styles.phoneNumberContainer}>
                                <MyButton
                                    title={phone}
                                    onPress={() => {
                                        if (communicationMethod === "phone") {
                                            Linking.openURL(`tel:${phone}`);
                                        }
                                        if (communicationMethod === "whatsapp") {
                                            const normalizedPhone = normalizePhoneForWhatsApp(phone);
                                            Linking.openURL(`https://wa.me/${normalizedPhone}`);
                                        }
                                        setIsPhoneModalVisible(false);
                                    }}
                                    variant="outlined"
                                    width="full"
                                />
                            </View>
                        ))}
                        <View style={styles.cancelButton}>
                            <MyButton
                                title="Отмена"
                                onPress={() => setIsPhoneModalVisible(false)}
                                variant="outlined"
                                width="full"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={quickMessagesVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setQuickMessagesVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setQuickMessagesVisible(false)}>
                    <Pressable style={styles.quickMessagesModalContent} onPress={() => {}}>
                        <Text style={{fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8}}>Быстрые сообщения</Text>
                        <ScrollView>
                            <Text style={{fontSize: 14, fontWeight: '500', color: '#0054d5', marginTop: 8}}>
                                В пути
                            </Text>
                            <View style={styles.quickMessagesContainer}>
                                {quickMessages.onTheWay.map((message, index) => (
                                    <TouchableOpacity
                                        onPress={() => pickQuickMessage(message)}
                                        key={index}
                                        style={[styles.quickMessage, {backgroundColor: '#f4f7fe', borderColor: '#0054d5'}]}
                                    >
                                        <Text style={{fontSize: 14, fontWeight: '400', color: '#0054d5'}}>{message}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={{fontSize: 14, fontWeight: '500', color: '#3da163', marginTop: 12}}>
                                У клиента
                            </Text>
                            <View style={styles.quickMessagesContainer}>
                                {quickMessages.atTheClient.map((message, index) => (
                                    <TouchableOpacity
                                        onPress={() => pickQuickMessage(message)}
                                        key={index}
                                        style={[styles.quickMessage, {backgroundColor: '#f6fbf5', borderColor: '#3da163'}]}
                                    >
                                        <Text style={{fontSize: 14, fontWeight: '400', color: '#3da163'}}>{message}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={{fontSize: 14, fontWeight: '500', color: '#f67912', marginTop: 12}}>
                                Доставка
                            </Text>
                            <View style={styles.quickMessagesContainer}>
                                {quickMessages.delivered.map((message, index) => (
                                    <TouchableOpacity
                                        onPress={() => pickQuickMessage(message)}
                                        key={index}
                                        style={[styles.quickMessage, {backgroundColor: '#fff3e6', borderColor: '#f67912'}]}
                                    >
                                        <Text style={{fontSize: 14, fontWeight: '400', color: '#f67912'}}>{message}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={{fontSize: 14, fontWeight: '500', color: '#ce1117', marginTop: 12}}>
                                Проблемы
                            </Text>
                            <View style={styles.quickMessagesContainer}>
                                {quickMessages.problems.map((message, index) => (
                                    <TouchableOpacity
                                        onPress={() => pickQuickMessage(message)}
                                        key={index}
                                        style={[styles.quickMessage, {backgroundColor: '#ffe6e7', borderColor: '#ce1117'}]}
                                    >
                                        <Text style={{fontSize: 14, fontWeight: '400', color: '#ce1117'}}>{message}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <View style={styles.cancelButton}>
                            <MyButton
                                title="Закрыть"
                                onPress={() => setQuickMessagesVisible(false)}
                                variant="outlined"
                                width="full"
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
    quickMessagesButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f9f9fb",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    quickMessagesButtonIcon: {
        fontSize: 18,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    quickMessagesModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    quickMessagesContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    quickMessage: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: '400',
        borderWidth: 1,
    },
    phoneNumberContainer: {
        marginBottom: 12,
        width: '100%',
    },
    cancelButton: {
        marginTop: 12,
        width: '100%',
    },
});

export default OrderChat;
