import MyButton from "@/components/MyButton";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";


const Success = () => {
    const router = useRouter();
    const { formData } = useLocalSearchParams();
    const income = JSON.parse(formData as string);

    return (
        <View style={styles.container}>
            <Image source={require("../assets/images/success.png")} style={styles.image} resizeMode="contain" />
            <View style={styles.content}>
                <Text style={styles.title}>
                    Товар доставлен
                </Text>
                <Text style={styles.subtitle}>
                    Вам будет начислено
                </Text>
                <Text style={styles.amount}>
                    {income} ₸
                </Text>
                <Text style={styles.description}>
                    Вернитесь на главную страницу, чтобы получить следующий заказ!
                </Text>
                <View style={styles.buttonContainer}>
                    <MyButton title="Вернуться на главную" onPress={() => router.replace("./main")} />
                </View>
            </View>
            
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7'
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
        color: '#2AA65C'
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

export default Success;