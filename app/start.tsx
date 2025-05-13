import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { useNavigation } from "@react-navigation/native";
// import { NavigationProps } from "../navigation/AppNavigatorTypes";
import { useRouter } from 'expo-router';
import MyButton from '../components/MyButton';


const StartScreen = () => {

    const router = useRouter();

    return (
        <View style={styles.container}>
        {/* Блок с иконкой */}
          <View style={styles.logoContainer}>
              <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
              />
          </View>

          {/* Блок с изображением */}
          <View style={styles.imageWrapper}>
              <View style={styles.imageContainer}>
                <Image 
                    source={require('../assets/images/startCourier.png')} 
                    style={styles.courierImage} 
                    resizeMode="contain" 
                />
              </View>
          </View>

          {/* Блок с текстом и кнопками */}
          <View style={styles.bottomContainer}>
              <Text style={styles.title}>
              Добро пожаловать в курьерское приложение
              </Text>
              <View style={styles.buttonContainer}>
              <MyButton 
                  title="Зарегистрироваться"
                  variant="contained"
                  disabled={false}
                  width="full"
                  onPress={() => router.push('/register')}
              />
              </View>
              <TouchableOpacity
                  onPress={() => router.push('/login')}
                  style={styles.loginButtonContainer}
                >
                <Text style={styles.loginText}>
                    У вас уже есть аккаунт? <Text style={styles.loginLink}>Войти</Text>
                </Text>
              </TouchableOpacity>
          </View>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  logoContainer: {
    width: '50%',
    paddingTop: 40,
    marginLeft: 16,
  },
  logo: {
    width: '100%',
  },
  imageWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  imageContainer: {
    height: '95%',
  },
  courierImage: {
    height: '100%',
    marginLeft: -60,
  },
  bottomContainer: {
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 58,
  },
  loginButtonContainer: {
    marginTop: 20,
  },
  loginText: {
    color: 'black',
    textAlign: 'center',
  },
  loginLink: {
    color: '#DC1818',
    fontWeight: '500',
  },
});

export default StartScreen;
