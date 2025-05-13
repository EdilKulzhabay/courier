import { useRouter } from "expo-router";
import { useState } from "react";
import { Dimensions, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import MultiSelectInput from "../components/MultiSelectInput";
import MyButton from "../components/MyButton";
import MySwitchToggle from "../components/MySwitchToggle";
import OutlinedFilledLabelInput from "../components/OutlinedFilledLabelInput";

const screenWidth = Dimensions.get('window').width;

const Register = () => {
    const router = useRouter();
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const languages = [
        { label: "Казахский", value: "kz" },
        { label: "Русский", value: "ru" },
        { label: "Английский", value: "en" },
    ];

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        languages: [""],
        birthDate: "",
        country: "",
        city: "",
        transport: "",
        inviteCode: "",
        termsAccepted: false,
        privacyAccepted: false,
    });

    const handleConfirm = (date: Date) => {
        const formatted = date.toISOString().slice(0, 10); // формат ГГГГ-ММ-ДД
        setForm({ ...form, birthDate: formatted });
        setDatePickerVisibility(false);
    };
    
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    const handleSubmit = () => {
        // Валидация формы
        if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.birthDate || 
            !form.country || !form.city || !form.termsAccepted || !form.privacyAccepted) {
            // Показать ошибку
            return;
        }
        
        // Отправка формы и переход на экран OTP
        router.push({
            pathname: './otp',
            params: { formData: JSON.stringify(form) }
        });
    };

    return (
        <ScrollView style={styles.container}>
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
            <View style={styles.formContainer}>
                <OutlinedFilledLabelInput
                    label="Имя (как в удостоверении)"
                    value={form.firstName}
                    onChangeText={(text) => setForm({ ...form, firstName: text })}
                    onRightIconPress={() => {}}
                />
                
                <OutlinedFilledLabelInput
                    label="Фамилия (как в удостоверении)" 
                    value={form.lastName} 
                    onChangeText={(text) => setForm({ ...form, lastName: text })} 
                    onRightIconPress={() => {}}
                />

                <OutlinedFilledLabelInput 
                    label="E-mail" 
                    keyboardType="email-address" 
                    value={form.email} 
                    onChangeText={(text) => setForm({ ...form, email: text })} 
                    onRightIconPress={() => {}}
                />

                <OutlinedFilledLabelInput 
                    label="Номер телефона" 
                    keyboardType="phone-pad" 
                    value={form.phone} 
                    onChangeText={(text) => setForm({ ...form, phone: text })} 
                    mask="phone"
                    onRightIconPress={() => {}}
                />

                <MultiSelectInput
                    label="Знание иностранных языков"
                    selectedValues={form.languages}
                    onChange={(values) => setForm({...form, languages: values})}
                    items={languages}
                    isMulti={true}
                />

                <OutlinedFilledLabelInput
                    label="Дата рождения"
                    value={form.birthDate}
                    editable={false}
                    onChangeText={() => {}}
                    showSoftInputOnFocus={false}
                    onRightIconPress={showDatePicker}
                    rightIcon={
                        <Image
                            source={require('../assets/images/calendar.png')}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                        />
                    }
                />

                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    onConfirm={handleConfirm}
                    onCancel={hideDatePicker}
                />

                <MultiSelectInput
                    label="Страна"
                    selectedValues={form.country ? [form.country] : []}
                    onChange={(values) => setForm({ ...form, country: values[0] })}
                    items={[
                        { label: "Казахстан", value: "kz" },
                    ]}
                    isMulti={false}
                />

                <MultiSelectInput
                    label="Город для доставки"
                    selectedValues={form.city ? [form.city] : []}
                    onChange={(values) => setForm({ ...form, city: values[0] })}
                    items={[
                        { label: "Алматы", value: "almaty" },
                    ]}
                    isMulti={false}
                />

                <OutlinedFilledLabelInput
                    label="Пригласительный код" 
                    value={form.inviteCode} 
                    onChangeText={(text) => setForm({ ...form, inviteCode: text })} 
                    onRightIconPress={() => {}}
                />
                
                <View style={styles.agreementRow}>
                    <View>
                        <Text style={styles.agreementText}>
                            Я согласен с{' '}
                        </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('https://tibetskaya.kz/agreement')}>
                            <Text style={styles.agreementLink}>Условиями обслуживания</Text>
                        </TouchableOpacity>
                    </View>
                    <MySwitchToggle
                        value={form.termsAccepted}
                        onPress={() => setForm({ ...form, termsAccepted: !form.termsAccepted })}
                    />
                </View>

                <View style={styles.agreementRow}>
                    <View>
                        <Text style={styles.agreementText}>
                            Я согласен с{' '}
                        </Text>
                        <TouchableOpacity onPress={() => Linking.openURL('https://tibetskaya.kz/privacyPolicy')}>
                            <Text style={styles.agreementLink}>Политикой конфиденциальности</Text>
                        </TouchableOpacity>
                    </View>
                    <MySwitchToggle
                        value={form.privacyAccepted}
                        onPress={() => setForm({ ...form, privacyAccepted: !form.privacyAccepted })}
                    />
                </View>
                
                <View style={{ marginTop: 20 }}>
                    <MyButton
                        title="Зарегистрировать заявку"
                        variant="contained"
                        disabled={!form.termsAccepted || !form.privacyAccepted || !form.firstName || !form.lastName || !form.email || !form.phone || !form.birthDate || !form.country || !form.city}
                        width="full"
                        onPress={handleSubmit}
                    />
                </View>
            </View>
        </ScrollView>
    );
};

export default Register;

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
    formContainer: {
        paddingHorizontal: 24,
        marginTop: 20,
        paddingBottom: 40
    },
    agreementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20
    },
    agreementText: {
        width: '60%'
    },
    agreementLink: {
        color: 'blue'
    }
});


