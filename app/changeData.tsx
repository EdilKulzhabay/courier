import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { apiService } from "../api/services"
import MultiSelectInput from "../components/MultiSelectInput"
import MyButton from "../components/MyButton"
import OutlinedFilledLabelInput from "../components/OutlinedFilledLabelInput"
import { CourierData } from "../types/interfaces"
import { updateCourierData } from "../utils/storage"

const ChangeData = () => {
    const router = useRouter();

    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    const [courier, setCourier] = useState<CourierData | null>(null);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        console.log("courierData = ", courierData);
        if (courierData?.userData?._id) {
            setCourier({...courierData.userData});
        } else {
            router.push("./start");
        }
    }

    useEffect(() => {
        fetchCourierData();
    }, []);

    const languages = [
        { label: "Казахский", value: "kz" },
        { label: "Русский", value: "ru" },
        { label: "Английский", value: "en" },
    ];

    const [form, setForm] = useState<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        languages: string[];
        birthDate: string;
        country: string;
        city: string;
    }>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        languages: [],
        birthDate: "",
        country: "",
        city: "",
    });

    useEffect(() => {
        if (courier) {
            setForm({
                firstName: courier.firstName || "",
                lastName: courier.lastName || "",
                email: courier.email || "",
                phone: courier.phone || "",
                languages: courier.languages || [],
                birthDate: courier.birthDate?.slice(0, 10) || "",
                country: courier.country || "",
                city: courier.city || "",
            });
        }
    }, [courier]);

    const handleConfirm = (date: Date) => {
        const formatted = date.toISOString().slice(0, 10); // формат ГГГГ-ММ-ДД
        setForm({ ...form, birthDate: formatted });
        setDatePickerVisibility(false);
    };
    
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    const changeData = async () => {
        if (courier?._id) {
            const res = await apiService.updateCourierData(courier._id, form);
            if (res.success) {
                setCourier({...res.userData});
                await updateCourierData(res.userData);
            }
        }
    }

    return <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Image
                    source={require("../assets/images/arrowBack.png")}
                    style={styles.backIcon}
                    resizeMode="contain"
                />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Изменить данные</Text>
        </View>

        <ScrollView style={styles.formContainer}>
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

            <View style={styles.buttonContainer}>
                <MyButton
                    title="Сохранить изменения"
                    onPress={changeData}
                    variant="contained"
                />
            </View>
        </ScrollView>
    </View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        paddingTop: 38
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
        marginBottom: 24,
        padding: 24
    },
    backButton: {
        padding: 8,
        backgroundColor: '#EFEFEF',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    backIcon: {
        width: 24,
        height: 24
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        marginLeft: 16,
        color: '#292D32'
    },
    formContainer: {
        marginTop: 8,
        paddingHorizontal: 24
    },
    buttonContainer: {
        paddingTop: 12,
        paddingBottom: 56
    }
});

export default ChangeData