import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    AppState,
    Dimensions,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiService } from '../api/services';
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotificationsAsync';
import { saveCourierData, saveTokenData } from '../utils/storage';

const screenWidth = Dimensions.get('window').width;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 59;

const Otp = () => {
    const router = useRouter();
    const { formData } = useLocalSearchParams();
    const form = JSON.parse(formData as string);

    const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(RESEND_COOLDOWN_SEC);
    const [isResending, setIsResending] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputs = useRef<Array<TextInput | null>>([]);
    const initialCodeSentRef = useRef(false);

    const resetLayout = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                resetLayout();
            }
        });

        return () => subscription.remove();
    }, [resetLayout]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (initialCodeSentRef.current) {
            return;
        }

        initialCodeSentRef.current = true;

        const sendInitialCode = async () => {
            try {
                const response = await apiService.sendCode({ email: form.email });
                if (!response.success) {
                    Alert.alert('Ошибка', response.message || 'Не удалось отправить код');
                }
            } catch {
                Alert.alert('Ошибка', 'Не удалось отправить код');
            }
        };

        sendInitialCode();
    }, [form.email]);

    const submitCode = async (fullCode: string) => {
        if (fullCode.length !== OTP_LENGTH || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiService.codeConfirm({ email: form.email, code: fullCode });
            if (res.success) {
                const response = await apiService.registerCourier(form);
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
                            'notificationPushToken',
                            pushToken,
                        );
                        await saveCourierData({
                            ...response.userData,
                            notificationPushToken: pushToken,
                        });
                    }

                    router.replace('./registerAccepted');
                } else {
                    Alert.alert('Ошибка', response.message || 'Ошибка при регистрации');
                    setCode(Array(OTP_LENGTH).fill(''));
                    inputs.current[0]?.focus();
                }
            } else {
                Alert.alert('Ошибка', res.message || 'Неверный код подтверждения');
                setCode(Array(OTP_LENGTH).fill(''));
                inputs.current[0]?.focus();
            }
        } catch {
            Alert.alert('Ошибка', 'Не удалось подтвердить код');
            setCode(Array(OTP_LENGTH).fill(''));
            inputs.current[0]?.focus();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (text: string, index: number) => {
        const digit = text.replace(/\D/g, '').slice(-1);
        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        if (digit && index < OTP_LENGTH - 1) {
            inputs.current[index + 1]?.focus();
        }

        const fullCode = newCode.join('');
        if (fullCode.length === OTP_LENGTH && newCode.every(Boolean)) {
            submitCode(fullCode);
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleResendCode = async () => {
        if (timer > 0 || isResending) {
            return;
        }

        setIsResending(true);
        try {
            const response = await apiService.sendCode({ email: form.email });
            if (response.success) {
                setTimer(RESEND_COOLDOWN_SEC);
                setCode(Array(OTP_LENGTH).fill(''));
                inputs.current[0]?.focus();
            } else {
                Alert.alert('Ошибка', response.message || 'Не удалось отправить код повторно');
            }
        } catch {
            Alert.alert('Ошибка', 'Не удалось отправить код повторно');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                

                <View style={styles.imageContainer}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image
                            source={require('../assets/images/arrowBack.png')}
                            style={styles.backIcon}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                    <Image
                        source={require('../assets/images/banner.png')}
                        style={styles.banner}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Дождитесь кода из сообщения</Text>
                    <Text style={styles.subtitle}>Код отправлен на почту {form.email}</Text>

                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                style={styles.inputBox}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                editable={!isSubmitting}
                                onChangeText={(text) => handleChange(text, index)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                ref={(ref) => {
                                    inputs.current[index] = ref;
                                }}
                            />
                        ))}
                    </View>

                    {timer > 0 ? (
                        <Text style={styles.timerText}>
                            Получить новый код можно через{' '}
                            <Text style={styles.timerHighlight}>{timer} сек</Text>
                        </Text>
                    ) : (
                        <TouchableOpacity
                            onPress={handleResendCode}
                            disabled={isResending}
                            style={styles.resendButton}
                        >
                            <Text style={styles.resendText}>
                                {isResending ? 'Отправка...' : 'Отправить код повторно'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 24,
    },
    backButton: {
        marginTop: 8,
        marginLeft: 24,
        padding: 8,
        position: 'absolute',
        top: 10,
        left: -10,
        zIndex: 100,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    imageContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 16,
        position: 'relative',
    },
    banner: {
        height: screenWidth / 1.76,
        width: '100%',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 32,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: 'gray',
        marginBottom: 24,
        textAlign: 'center',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 320,
        marginBottom: 24,
    },
    inputBox: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        width: 48,
        height: 56,
        textAlign: 'center',
        fontSize: 20,
        borderRadius: 8,
    },
    timerText: {
        color: '#666',
        textAlign: 'center',
    },
    timerHighlight: {
        color: '#DC1818',
    },
    resendButton: {
        paddingVertical: 8,
    },
    resendText: {
        color: '#0066cc',
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default Otp;
