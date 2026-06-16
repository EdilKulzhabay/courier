import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface Props extends TextInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    onRightIconPress?: () => void;
    mask?: "phone";
    rightIcon?: ReactNode; // 👈 иконка справа
    isPassword?: boolean
}

const extractPhoneDigits = (text: string) => text.replace(/\D/g, "").slice(0, 11);

const formatKzPhone = (digits: string) => {
    if (digits.length === 0) return "";
    let result = "+7";
    if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
    if (digits.length >= 4) result += `) ${digits.slice(4, 7)}`;
    if (digits.length >= 7) result += `-${digits.slice(7, 9)}`;
    if (digits.length >= 9) result += `-${digits.slice(9, 11)}`;
    return result;
};

const applyPhoneMask = (text: string, previousValue: string) => {
    const prevDigits = extractPhoneDigits(previousValue);
    let newDigits = extractPhoneDigits(text);

    // При удалении символа маски (пробел, скобка, дефис) цифры не меняются —
    // удаляем последнюю цифру, чтобы backspace работал ожидаемо.
    if (
        text.length < previousValue.length &&
        newDigits.length === prevDigits.length &&
        prevDigits.length > 0
    ) {
        newDigits = prevDigits.slice(0, -1);
    }

    return formatKzPhone(newDigits);
};

const OutlinedFilledLabelInput: React.FC<Props> = ({
    label,
    value,
    onChangeText,
    onRightIconPress,
    mask,
    rightIcon,
    isPassword = false,
    ...rest
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecure, setIsSecure] = useState(true);
    const inputRef = useRef<TextInput>(null);
    const animatedLabel = useState(new Animated.Value(value ? 1 : 0))[0];

    useEffect(() => {
        Animated.timing(animatedLabel, {
            toValue: isFocused || value ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value]);

    const labelStyle = {
        top: animatedLabel.interpolate({
            inputRange: [0, 1],
            outputRange: [18, 4],
        }),
        fontSize: animatedLabel.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 12],
        }),
        color: "#99A3B3",
    };

    const toggleSecure = () => setIsSecure(!isSecure);

    return (
        <TouchableWithoutFeedback onPress={() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }}>
            <View style={styles.container}>
                <View style={styles.inputContainer}>
                    <Animated.Text
                        style={[styles.animatedLabel, labelStyle]}
                    >
                        {label}
                    </Animated.Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={value}
                            keyboardType={rest.keyboardType}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            secureTextEntry={isPassword && isSecure}
                            onChangeText={(text) => {
                            if (mask === "phone") {
                                onChangeText(applyPhoneMask(text, value));
                            } else {
                                onChangeText(text);
                            }
                            }}
                            {...rest}
                        />
                    </View>
                    {isPassword ? (
                        <TouchableOpacity onPress={toggleSecure} style={styles.iconButton}>
                            <Image
                                source={
                                    isSecure
                                    ? require("../assets/images/EyeSlash.png") // Иконка "глаз с чертой" (скрыт)
                                    : require("../assets/images/Eye.png") // Иконка "глаз" (виден)
                                }
                                style={{ width: 24, height: 24 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                        ) : (
                        rightIcon && (
                            <TouchableOpacity onPress={onRightIconPress} style={styles.iconButton}>
                                {rightIcon}
                            </TouchableOpacity>
                        )
                    )}
                </View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 8,
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingTop: 28,
        paddingBottom: 8,
        borderColor: '#EDEDED',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
    },
    animatedLabel: {
        position: 'absolute',
        left: 12,
        paddingHorizontal: 4,
    },
    inputWrapper: {
        flex: 1,
    },
    input: {
        fontSize: 18,
        color: 'black',
        padding: 0,
        margin: 0,
        marginBottom: -4,
    },
    iconButton: {
        marginLeft: 8,
        marginTop: -20,
    },
});

export default OutlinedFilledLabelInput;
