import MyButton from "@/components/MyButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Platform, StyleSheet, Text, View } from "react-native";

const Cancelled = () => {
    const router = useRouter();
    const { formData } = useLocalSearchParams();
    const income = JSON.parse(formData as string);

    return (
        <View style={styles.container}>
            <Image source={require("../assets/images/cancelled.png")} style={styles.image} resizeMode="contain" />
            <View style={styles.content}>
                <Text style={styles.title}>
                    Заказ отменен
                </Text>
                <Text style={styles.subtitle}>
                    Вы могли заработать
                </Text>
                <Text style={styles.amount}>
                    {income} ₸
                </Text>
                <Text style={styles.description}>
                    Вернитесь на главную страницу, чтобы получить следующий заказ!
                </Text>
                <View style={styles.buttonContainer}>
                    <MyButton title="Вернуться на главную" onPress={() => router.push("./main")} />
                </View>
            </View>
        </View>
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
    image: {
        width: 258,
        height: 258,
        alignSelf: "center",
        marginTop: 100
    },
    content: {
        flex: 1,
        paddingHorizontal: 50
    },
    title: {
        fontSize: 24,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 60
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12
    },
    amount: {
        fontSize: 32,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 12,
        color: '#E64B32'
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
        opacity: 0.5
    },
    buttonContainer: {
        marginTop: 'auto',
        paddingBottom: 40
    }
});

export default Cancelled;