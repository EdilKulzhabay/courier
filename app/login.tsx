import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiService } from "../api/services";
import MyButton from "../components/MyButton";
import OutlinedFilledLabelInput from "../components/OutlinedFilledLabelInput";
import { saveCourierData, saveTokenData } from "../utils/storage";
const screenWidth = Dimensions.get('window').width

const Login = () => {
    const router = useRouter();

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await apiService.loginCourier({ email, password });
            if (response.success) {
                console.log("response.userData = ", response.userData);
                console.log("1response.token = ", response.token);
                
                const token = await registerForPushNotificationsAsync();
                if (token && response.userData && response.userData.notificationPushToken !== token) {
                    await apiService.updateData(response.userData._id, "notificationPushToken", token);
                    await saveCourierData({ ...response.userData, notificationPushToken: token });
                } else {
                    await saveCourierData({ ...response.userData });
                }

                console.log("2response.token = ", response.token);
                
                await saveTokenData({
                    token: response.token,
                });
                router.replace("./main");
            } else {
                console.log(response.error);
                Alert.alert("Ошибка", "Неверный логин или пароль");
            }
        } catch (error) {
            console.error("Ошибка при входе:", error);
            Alert.alert("Ошибка", "Неправильный логин или пароль");
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>

            <View style={styles.bannerContainer}>
                <Image
                    source={require('../assets/images/banner.png')} 
                    style={{height: screenWidth / 1.76}}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.headerContainer}>
                <Text style={styles.title}>
                    Добро пожаловать!
                </Text>
                <Text style={styles.subtitle}>
                    Введите данные, чтобы продолжить
                </Text>
            </View>

            <View style={styles.contentContainer}>
                <View>
                    <OutlinedFilledLabelInput
                        label="Введите почту" 
                        keyboardType="email-address" 
                        value={email} 
                        onChangeText={(text) => setEmail(text)} 
                        onRightIconPress={() => {}}
                        autoCapitalize="none"
                    />

                    <OutlinedFilledLabelInput
                        label="Введите пароль" 
                        keyboardType="default" 
                        value={password} 
                        onChangeText={(text) => setPassword(text)} 
                        onRightIconPress={() => {}}
                        isPassword={true}
                        autoCapitalize="none"
                    />

                    {/* <TouchableOpacity onPress={() => {}} style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
                    </TouchableOpacity> */}
                </View>

                <View>
                    <MyButton
                        title="Войти"
                        variant="contained"
                        disabled={false}
                        width="full"
                        onPress={handleLogin}
                        loading={loading}
                    />
                    <TouchableOpacity 
                        onPress={() => router.push("./register")} 
                        style={styles.registerContainer}>
                        <Text style={styles.registerText}>
                            Еще нет аккаунта? <Text style={styles.registerLink}>Зарегистрироваться</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
          
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: 'white'
    },
    bannerContainer: {
        width: '100%',
        alignItems: 'center'
    },
    headerContainer: {
        marginTop: 38,
        paddingHorizontal: 24
    },
    title: {
        fontSize: 24,
        fontWeight: '600'
    },
    subtitle: {
        marginTop: 12,
        fontSize: 14,
        opacity: 0.4
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 24,
        marginTop: 20,
        paddingBottom: 40,
        justifyContent: 'space-between',
        // minHeight: Dimensions.get('window').height - (screenWidth / 1.76 + 38 + 24 + 20)
    },
    forgotPassword: {
        marginTop: 5,
        alignItems: 'flex-end'
    },
    forgotPasswordText: {
        color: '#DC1818',
        fontWeight: '500',
        fontSize: 14
    },
    registerContainer: {
        marginTop: 20
    },
    registerText: {
        color: 'black',
        textAlign: 'center'
    },
    registerLink: {
        color: '#DC1818',
        fontWeight: '500'
    }
});

export default Login;