import { apiService } from "@/api/services";
import MyButton from "@/components/MyButton";
import OutlinedFilledLabelInput from "@/components/OutlinedFilledLabelInput";
import { removeOrderData, updateCourierData } from "@/utils/storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CancelledReason = () => {
    const router = useRouter();
    const { formData } = useLocalSearchParams();
    const { orderId, income } = JSON.parse(formData as string);
    const [isLoading, setIsLoading] = useState(false);

    const [reason, setReason] = useState("");

    // Предустановленные причины отмены
    const predefinedReasons = [
        "Нет дома",
        "Не берут телефон", 
        "Не заказывали",
        "Отменяли заказ",
        "Закрылись, не успели"
    ];

    // Генерируем временные слоты с 10:00 до 18:00 с промежутком в час
    const timeSlots = [];
    for (let hour = 10; hour <= 18; hour++) {
        timeSlots.push(`Просили после ${hour}:00`);
    }

    const allReasons = [...predefinedReasons, ...timeSlots];

    // Функция для обработки нажатия на тег
    const handleReasonToggle = (selectedReason: string) => {
        const reasonArray = reason.split(', ').filter(r => r.trim() !== '');
        
        if (reasonArray.includes(selectedReason)) {
            // Убираем причину если она уже есть
            const updatedReasons = reasonArray.filter(r => r !== selectedReason);
            setReason(updatedReasons.join(', '));
        } else {
            // Добавляем причину
            const updatedReasons = [...reasonArray, selectedReason];
            setReason(updatedReasons.join(', '));
        }
    };

    // Проверяем, выбрана ли причина
    const isReasonSelected = (selectedReason: string) => {
        const reasonArray = reason.split(', ').filter(r => r.trim() !== '');
        return reasonArray.includes(selectedReason);
    };

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        if (courierData.success) {
            await updateCourierData(courierData.userData);
        }
    };

    const cancelOrder = async () => {
        console.log("we in cancel order orderid = ", orderId, reason);
        
        setIsLoading(true);
        if (reason.length === 0) {
            Alert.alert("Внимание", "Пожалуйста, укажите причину отмены заказа");
            setIsLoading(false);
            return;
        }
        const res = await apiService.cancelOrder(orderId, reason);
        console.log(orderId, income);
        
        if (res.success) {
            await removeOrderData();
            setIsLoading(false);
            router.push({
                pathname: '/cancelled' as any,
                params: { formData: JSON.stringify(income) }
            });
            // await apiService.orTools();
        } else {
            Alert.alert("Ошибка", res.message);
            setIsLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Причина отмены</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Укажите причину отмены заказа</Text>
                <OutlinedFilledLabelInput label="Причина отмены" value={reason} onChangeText={(text) => setReason(text)} />

                <View style={styles.reasonTagsContainer}>
                    <Text style={styles.reasonTagsTitle}>Быстрый выбор:</Text>
                    <View style={styles.reasonTags}>
                        {allReasons.map((reasonItem, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.reasonTag,
                                    isReasonSelected(reasonItem) && styles.reasonTagSelected
                                ]}
                                onPress={() => handleReasonToggle(reasonItem)}
                            >
                                <Text style={[
                                    styles.reasonTagText,
                                    isReasonSelected(reasonItem) && styles.reasonTagTextSelected
                                ]}>
                                    {reasonItem}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.warning}>
                    <Image source={require("../assets/images/danger.png")} style={styles.warningIcon} resizeMode="contain" />
                    <Text style={styles.warningText}>
                        Внимание! Нажимая на кнопку "Сохранить" ваш заказ будет безвозвратно отменен
                    </Text>
                </View>
                <View style={styles.buttonContainer}>
                    <MyButton title="Сохранить" onPress={cancelOrder} disabled={isLoading} loading={isLoading} />
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        marginBottom: 24,
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
        paddingHorizontal: 24
    },
    title: {
        fontSize: 20,
        fontWeight: '500',
        color: '#292D32',
        marginBottom: 16
    },
    reasonTagsContainer: {
        marginTop: 20,
        marginBottom: 20
    },
    reasonTagsTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#292D32',
        marginBottom: 12
    },
    reasonTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    reasonTag: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        marginBottom: 8
    },
    reasonTagSelected: {
        backgroundColor: '#DC3F34',
        borderColor: '#DC3F34'
    },
    reasonTagText: {
        fontSize: 14,
        color: '#666666',
        fontWeight: '400'
    },
    reasonTagTextSelected: {
        color: '#FFFFFF',
        fontWeight: '500'
    },
    warning: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center'
    },
    warningIcon: {
        width: 24,
        height: 24
    },
    warningText: {
        marginLeft: 8,
        flex: 1
    },
    buttonContainer: {
        marginTop: 40,
        paddingBottom: 40
    }
});

export default CancelledReason;