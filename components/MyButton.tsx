import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

type MyButtonProps = {
    title: string;
    variant?: "contained" | "outlined";
    disabled?: boolean;
    width?: "full" | "content";
    onPress?: () => void;
    loading?: boolean;
};

const MyButton: React.FC<MyButtonProps> = ({
    title,
    variant = "contained",
    disabled = false,
    width = "full",
    onPress,
    loading = false,
}) => {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                variant === "outlined" ? styles.outlined : styles.contained,
                (disabled || loading) && styles.disabled,
                width === "full" ? styles.fullWidth : styles.contentWidth,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={variant === "outlined" ? "#DC1818" : "white"} />
            ) : (
                <Text style={[styles.text, variant === "outlined" && styles.textOutlined]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  contained: {
    backgroundColor: "#DC1818",
    borderColor: "#DC1818",
  },
  outlined: {
    backgroundColor: "#FFF",
    borderColor: "#DC1818",
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: "100%",
  },
  contentWidth: {
    alignSelf: "flex-start",
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "medium",
  },
  textOutlined: {
    color: "#DC1818",
  },
});

export default MyButton;