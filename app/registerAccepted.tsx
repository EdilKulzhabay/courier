import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MyButton from "../components/MyButton";

const screenWidth = Dimensions.get("window").width
const screenHeight = Dimensions.get("window").height

const COLORS = ["#ff4d4d", "#4d94ff", "#4dff88", "#ffc94d", "#ff66d9"]

const ConfettiPiece = ({ startX, color }: { startX: number; color: string }) => {
  const fall = useRef(new Animated.Value(0)).current
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fall, {
        toValue: screenHeight,
        duration: 4000 + Math.random() * 2000,
        useNativeDriver: true,
      }),
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000 + Math.random() * 2000,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: startX,
        width: 10,
        height: 10,
        backgroundColor: color,
        borderRadius: 2,
        transform: [
          { translateY: fall },
          { rotate },
          { translateX: new Animated.Value(Math.random() * 10 - 5) },
        ],
      }}
    />
  )
}

const RegisterAccepted = () => {
    const router = useRouter();

    const renderConfetti = () => {
        return new Array(30).fill(0).map((_, i) => (
          <ConfettiPiece
            key={i}
            startX={Math.random() * screenWidth}
            color={COLORS[Math.floor(Math.random() * COLORS.length)]}
          />
        ))
      }

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFill}>{renderConfetti()}</View>
            <View></View>
            <View>
                <View style={styles.imageContainer}>
                    <Image 
                        source={require("../assets/images/Pagada.png")} 
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>
                
                <Text style={styles.title}>Ваша заявка принята!</Text>
                <View style={styles.subtitleContainer}>
                    <Text style={styles.subtitle}>Вы получите СМС уведомление об успешной регистрации</Text>
                </View>
            </View>
            <View>
                <MyButton
                    title="Вернуться на главную"
                    variant="contained"
                    disabled={false}
                    width="full"
                    onPress={() => {router.replace("./main")}}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: '#F7F7F7',
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'space-between'
    },
    imageContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    image: {
        height: 258
    },
    title: {
        fontSize: 24, 
        fontWeight: 'bold', 
        textAlign: 'center', 
        marginTop: 40
    },
    subtitleContainer: {
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#7e7d7d',
        width: '60%'
    }
});

export default RegisterAccepted