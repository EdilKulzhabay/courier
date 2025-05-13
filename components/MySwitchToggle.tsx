import React, { useEffect, useRef } from "react";
import { Animated, TouchableOpacity, View } from "react-native";

type MySwitchToggleProps = {
    value: boolean;
    onPress: () => void;
};

const MySwitchToggle: React.FC<MySwitchToggleProps> = ({
    value,
    onPress,
}) => {
    const translateX = useRef(new Animated.Value(value ? 21 : 0)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: value ? 21 : 0,
            useNativeDriver: true,
            bounciness: 0,
        }).start();
    }, [value]);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={{
                width: 51,
                height: 31,
            }}
        >
            <View
                style={{
                    width: 51,
                    height: 31,
                    borderRadius: 15.5,
                    backgroundColor: value ? '#2AA65C' : '#E5E5EA',
                    justifyContent: 'center',
                }}
            >
                <Animated.View
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: '#FFF',
                        transform: [{ translateX }],
                        marginLeft: 2,
                        shadowColor: "#000",
                        shadowOffset: {
                        width: 0,
                        height: 2,
                        },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        elevation: 5,
                    }}
                />
            </View>
        </TouchableOpacity>
    );
};

export default MySwitchToggle;