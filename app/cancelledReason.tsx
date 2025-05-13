import { apiService } from "@/api/services";
import MyButton from "@/components/MyButton";
import OutlinedFilledLabelInput from "@/components/OutlinedFilledLabelInput";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CancelledReason = () => {
    const router = useRouter();
    const { formData } = useLocalSearchParams();
    const { orderId, income } = JSON.parse(formData as string);

    const [reason, setReason] = useState("");

    const cancelOrder = async () => {
        if (reason.length === 0) {
            Alert.alert("Внимание", "Пожалуйста, укажите причину отмены заказа");
            return;
        }
        const res = await apiService.cancelOrder(orderId, reason);
        console.log(orderId, income);
        
        if (res.success) {
            router.push({
                pathname: '/cancelled' as any,
                params: { formData: JSON.stringify(income) }
            });
        } else {
            Alert.alert("Ошибка", res.message);
        }
    }

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
                <Text style={styles.headerTitle}>Причина отмены</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Укажите причину отмены заказа</Text>
                <OutlinedFilledLabelInput label="Причина отмены" value={reason} onChangeText={(text) => setReason(text)} />

                <View style={styles.warning}>
                    <Image source={require("../assets/images/danger.png")} style={styles.warningIcon} resizeMode="contain" />
                    <Text style={styles.warningText}>
                        Внимание! Нажимая на кнопку "Сохранить" ваш заказ будет безвозвратно отменен
                    </Text>
                </View>
                <View style={styles.buttonContainer}>
                    <MyButton title="Сохранить" onPress={cancelOrder} />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        paddingTop: 38
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