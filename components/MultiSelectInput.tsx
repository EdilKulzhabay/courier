import React, { useState, useEffect } from "react";
import {
    View,
    Animated,
    TouchableOpacity,
    Text,
    Modal,
    ScrollView,
    StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // или использовать любой другой набор иконок

interface Item {
    label: string;
    value: string;
}

interface MultiSelectProps {
    label: string;
    selectedValues: string[];
    onChange: (values: string[]) => void;
    items: Item[];
    isMulti?: boolean;
}

const MultiSelectInput: React.FC<MultiSelectProps> = ({
    label,
    selectedValues,
    onChange,
    items,
    isMulti = true,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const animatedLabel = useState(new Animated.Value(selectedValues.length ? 1 : 0))[0];

    useEffect(() => {
        Animated.timing(animatedLabel, {
            toValue: isFocused || selectedValues.length ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
    }, [isFocused, selectedValues]);

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

    const toggleSelection = (value: string) => {
        if (isMulti) {
            if (selectedValues.includes(value)) {
                onChange(selectedValues.filter((v) => v !== value));
            } else {
                onChange([...selectedValues, value]);
            }
        } else {
            onChange([value]);
            setModalVisible(false); // для сингл-выбора — закрываем модалку сразу
            setIsFocused(false);
        }
    };

    const getLabelText = () => {
        if (!selectedValues.length) return "";
        return items
            .filter((item) => selectedValues.includes(item.value))
            .map((item) => item.label)
            .join(", ");
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                setModalVisible(true);
                setIsFocused(true);
                }}
            >
                <View style={styles.inputContainer}>
                    <Animated.Text
                        style={[styles.animatedLabel, labelStyle]}
                    >
                        {label}
                    </Animated.Text>
                    <View style={styles.labelContainer}>
                        <Text style={styles.labelText}>{getLabelText()}</Text>
                        <Ionicons
                            name={modalVisible ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#99A3B3"
                            style={{marginTop: -10}}
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="slide">
                <TouchableOpacity
                activeOpacity={1}
                onPressOut={() => {
                    setModalVisible(false);
                    setIsFocused(false);
                }}
                style={styles.modalOverlay}
                >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{label}</Text>

                    <ScrollView>
                    {items.map((item) => {
                        const isSelected = selectedValues.includes(item.value);
                        return (
                        <TouchableOpacity
                            key={item.value}
                            onPress={() => toggleSelection(item.value)}
                            style={[styles.optionItem, isSelected && styles.selectedItem]}
                        >
                            <Text style={styles.optionText}>
                            {item.label}
                            </Text>
                            {isSelected && (
                            <Ionicons name="checkmark" size={20} color="green" />
                            )}
                        </TouchableOpacity>
                        );
                    })}
                    </ScrollView>

                    {isMulti && (
                    <TouchableOpacity
                        onPress={() => {
                        setModalVisible(false);
                        setIsFocused(false);
                        }}
                        style={styles.doneButton}
                    >
                        <Text style={styles.doneButtonText}>
                            Готово
                        </Text>
                    </TouchableOpacity>
                    )}
                </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 8,
        backgroundColor: 'white',
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingTop: 28,
        paddingBottom: 12,
        borderColor: '#EDEDED',
        minHeight: 56,
        justifyContent: 'center',
    },
    animatedLabel: {
        position: 'absolute',
        left: 12,
        paddingHorizontal: 4,
        backgroundColor: 'white',
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelText: {
        fontSize: 18,
        color: 'black',
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        maxHeight: '60%',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    selectedItem: {
        backgroundColor: '#f5f5f5',
    },
    optionText: {
        flex: 1,
        fontSize: 18,
        color: 'black',
    },
    doneButton: {
        marginTop: 16,
        backgroundColor: 'black',
        paddingVertical: 12,
        borderRadius: 12,
    },
    doneButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: 18,
    },
});

export default MultiSelectInput;
