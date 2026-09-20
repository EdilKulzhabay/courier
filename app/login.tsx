import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Dimensions, Image, Keyboard, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { apiService } from "../api/services";
import MyButton from "../components/MyButton";
import OutlinedFilledLabelInput from "../components/OutlinedFilledLabelInput";
import { saveCourierData, saveTokenData } from "../utils/storage";
const screenWidth = Dimensions.get('window').width

const Login = () => {
    const router = useRouter();

    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            const response = await apiService.loginCourier(
                loginMethod === 'phone' ? { phone, password } : { email, password }
            );
            if (response.success) {
                await saveTokenData({ token: response.token });
                await saveCourierData({ ...response.userData });

                const pushToken = await registerForPushNotificationsAsync();
                if (
                    pushToken &&
                    response.userData &&
                    response.userData.notificationPushToken !== pushToken
                ) {
                    await apiService.updateData(
                        response.userData._id,
                        "notificationPushToken",
                        pushToken,
                    );
                    await saveCourierData({
                        ...response.userData,
                        notificationPushToken: pushToken,
                    });
                }

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
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>

                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image
                            source={require('../assets/images/arrowBack.png')}
                            style={styles.backIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>

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
                            {loginMethod === 'phone' ? (
                                <OutlinedFilledLabelInput
                                    label="Номер телефона"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={(text) => setPhone(text)}
                                    mask="phone"
                                    onRightIconPress={() => {}}
                                />
                            ) : (
                                <OutlinedFilledLabelInput
                                    label="Введите почту"
                                    keyboardType="email-address"
                                    value={email}
                                    onChangeText={(text) => setEmail(text)}
                                    onRightIconPress={() => {}}
                                    autoCapitalize="none"
                                />
                            )}

                            <OutlinedFilledLabelInput
                                label="Введите пароль"
                                keyboardType="default"
                                value={password}
                                onChangeText={(text) => setPassword(text)}
                                onRightIconPress={() => {}}
                                isPassword={true}
                                autoCapitalize="none"
                            />

                            <TouchableOpacity
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setLoginMethod(loginMethod === 'phone' ? 'email' : 'phone');
                                }}
                                style={styles.forgotPassword}
                            >
                                <Text style={styles.forgotPasswordText}>
                                    {loginMethod === 'phone' ? 'Войти через почту' : 'Войти через телефон'}
                                </Text>
                            </TouchableOpacity>
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
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: 'white'
    },
    backButton: {
        position: 'absolute',
        top: 30,
        left: 16,
        zIndex: 100,
        padding: 8,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        width: 24,
        height: 24,
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