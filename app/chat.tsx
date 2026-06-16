import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Platform, Modal, Pressable, Linking } from "react-native";
import { apiService } from "../api/services";
import { useMemo, useState } from "react";
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

const Chat = () => {
    const { notificationToken, currentPhone: currentPhoneParam } = useLocalSearchParams();
    const [communicationMethod, setCommunicationMethod] = useState<string>("phone");
    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
    const router = useRouter();

    const currentPhone = useMemo(() => {
        try {
            const parsed = JSON.parse((currentPhoneParam as string) || "[]");
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    }, [currentPhoneParam]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");

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

    const openModal = (message: string) => {
        setMessage(message);
        setModalVisible(true);
    }

    const sendNotificationToClient = async () => {
        setLoading(true);
        try {
            const res = await apiService.sendNotificationToClient(notificationToken as string, message);
            if (res.success) {
                setModalVisible(false);
            } else {
                Alert.alert('Ошибка', res.message || 'Не удалось отправить уведомление');
            }
        } catch {
            Alert.alert('Ошибка', 'Не удалось отправить уведомление');
        } finally {
            setLoading(false);
        }
    }
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back() as any} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Чат с клиентом</Text>
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

            <View style={styles.content}>
                <ScrollView style={styles.scrollView}>
                    <View style={styles.section}>
                        <Text style={{fontSize: 14, fontWeight: '500', color: '#000'}}>Быстрые сообщения</Text>
                        <Text style={{fontSize: 14, fontWeight: '500', color: '#0054d5', marginTop: 8}}>
                            В пути
                        </Text>
                        <View style={styles.quickMessagesContainer}>
                            {quickMessages.onTheWay.map((message, index) => (
                                <TouchableOpacity 
                                    onPress={() => {
                                        openModal(message)
                                    }}
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
                                    onPress={() => {
                                        openModal(message)
                                    }}
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
                                    onPress={() => {
                                        openModal(message)
                                    }}
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
                                    onPress={() => {
                                        openModal(message)
                                    }}
                                    key={index} 
                                    style={[styles.quickMessage, {backgroundColor: '#ffe6e7', borderColor: '#ce1117'}]}
                                >
                                    <Text style={{fontSize: 14, fontWeight: '400', color: '#ce1117'}}>{message}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>

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

            <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalContent} onPress={() => {}}>
                        <Text style={styles.modalTitle}>{message}</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={sendNotificationToClient}>
                            <Text style={styles.modalButtonText}>Отправить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{
                            backgroundColor: '#ffffff',
                            padding: 12,
                            borderRadius: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 12,
                            width: '100%',
                            borderWidth: 1,
                            borderColor: '#E3E3E3',
                        }} onPress={() => setModalVisible(false)}>
                            <Text style={{fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center'}}>Отмена</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    section: {
        marginTop: 12,
        borderWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E3E3E3',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        padding: 24
    },
    backButton: {
        padding: 8,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    backIcon: {
        width: 24,
        height: 24
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        marginLeft: 16,
        color: '#292D32'
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 50,
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
    modalButton: {
        backgroundColor: '#DC1818',
        padding: 12,
        borderRadius: 8,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
    },
    phoneNumberContainer: {
        marginBottom: 12,
        width: '100%',
    },
    cancelButton: {
        marginTop: 8,
        width: '100%',
    },
});

export default Chat;