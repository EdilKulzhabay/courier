import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
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

    const [loading, setLoading] = useState(false);

    const [cardDataForm, setCardDataForm] = useState({
        accountNumber: "",
        IIN: "",
        fullName: "",
    });
    const [cardDataLoading, setCardDataLoading] = useState(false);

    const [carDataForm, setCarDataForm] = useState({
        brand: "",
        model: "",
        color: "",
        plateNumber: "",
    });
    const [carDataLoading, setCarDataLoading] = useState(false);

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
            setCardDataForm({
                accountNumber: courier.cardData?.accountNumber || "",
                IIN: courier.cardData?.IIN || "",
                fullName: courier.cardData?.fullName || "",
            });
            setCarDataForm({
                brand: courier.carData?.brand || "",
                model: courier.carData?.model || "",
                color: courier.carData?.color || "",
                plateNumber: courier.carData?.plateNumber || "",
            });
        }
    }, [courier]);

    const saveCardData = async () => {
        const accountNumber = cardDataForm.accountNumber.trim().toUpperCase();
        const IIN = cardDataForm.IIN.trim();
        const fullName = cardDataForm.fullName.trim();

        if (!accountNumber || !IIN || !fullName) {
            Alert.alert("Ошибка", "Заполните все поля банковских реквизитов");
            return;
        }

        Alert.alert(
            "Проверьте данные",
            "Убедитесь, что банковские реквизиты введены правильно",
            [
                { text: "Отмена", style: "cancel" },
                { text: "Сохранить", onPress: () => submitCardData(accountNumber, IIN, fullName) },
            ]
        );
    };

    const submitCardData = async (accountNumber: string, IIN: string, fullName: string) => {
        setCardDataLoading(true);
        try {
            const data = { accountNumber, IIN, fullName };
            const res = await apiService.updateData(courier?._id || "", "cardData", data);
            if (res.success) {
                setCardDataForm(data);
                setCourier((prev) => (prev ? { ...prev, cardData: data } : prev));
                Alert.alert("Готово", "Банковские реквизиты сохранены");
            } else {
                Alert.alert("Ошибка", res.message || "Не удалось сохранить реквизиты");
            }
        } catch {
            Alert.alert("Ошибка", "Не удалось сохранить реквизиты");
        } finally {
            setCardDataLoading(false);
        }
    };

    const saveCarData = async () => {
        const brand = carDataForm.brand.trim();
        const model = carDataForm.model.trim();
        const color = carDataForm.color.trim();
        const plateNumber = carDataForm.plateNumber.trim().toUpperCase();

        if (!brand || !model || !color || !plateNumber) {
            Alert.alert("Ошибка", "Заполните все поля данных машины");
            return;
        }

        setCarDataLoading(true);
        try {
            const data = { brand, model, color, plateNumber };
            const res = await apiService.updateData(courier?._id || "", "carData", data);
            if (res.success) {
                setCarDataForm(data);
                setCourier((prev) => (prev ? { ...prev, carData: data } : prev));
                Alert.alert("Готово", "Данные машины сохранены");
            } else {
                Alert.alert("Ошибка", res.message || "Не удалось сохранить данные машины");
            }
        } catch {
            Alert.alert("Ошибка", "Не удалось сохранить данные машины");
        } finally {
            setCarDataLoading(false);
        }
    };

    const handleConfirm = (date: Date) => {
        const formatted = date.toISOString().slice(0, 10); // формат ГГГГ-ММ-ДД
        setForm({ ...form, birthDate: formatted });
        setDatePickerVisibility(false);
    };
    
    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);

    const changeData = async () => {
        setLoading(true);
        if (courier?._id) {
            const res = await apiService.updateCourierData(courier._id, form);
            if (res.success) {
                setCourier({...res.userData});
                await updateCourierData(res.userData);
            }
        }
        setLoading(false);
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

        <KeyboardAwareScrollView
            style={styles.formContainer}
            bottomOffset={24}
        >
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
                    loading={loading}
                />
            </View>

            <Text style={styles.sectionTitle}>Банковские реквизиты</Text>
            <Text style={styles.sectionSubtitle}>
                Нужны для вывода средств. Номер счета (IBAN) — 20 символов, начинается с KZ.
            </Text>

            <OutlinedFilledLabelInput
                label="Номер счета (IBAN)"
                value={cardDataForm.accountNumber}
                onChangeText={(text) => setCardDataForm({ ...cardDataForm, accountNumber: text.toUpperCase() })}
                autoCapitalize="characters"
                maxLength={20}
                onRightIconPress={() => {}}
            />

            <OutlinedFilledLabelInput
                label="ИИН получателя"
                value={cardDataForm.IIN}
                onChangeText={(text) => setCardDataForm({ ...cardDataForm, IIN: text.replace(/\D/g, "") })}
                keyboardType="numeric"
                maxLength={12}
                onRightIconPress={() => {}}
            />

            <OutlinedFilledLabelInput
                label="ФИО получателя"
                value={cardDataForm.fullName}
                onChangeText={(text) => setCardDataForm({ ...cardDataForm, fullName: text })}
                onRightIconPress={() => {}}
            />

            <View style={styles.buttonContainer}>
                <MyButton
                    title="Сохранить реквизиты"
                    onPress={saveCardData}
                    variant="contained"
                    loading={cardDataLoading}
                />
            </View>

            <Text style={styles.sectionTitle}>Данные машины</Text>
            <Text style={styles.sectionSubtitle}>
                Нужны для получения заказов.
            </Text>

            <OutlinedFilledLabelInput
                label="Марка машины"
                value={carDataForm.brand}
                onChangeText={(text) => setCarDataForm({ ...carDataForm, brand: text })}
                onRightIconPress={() => {}}
            />

            <OutlinedFilledLabelInput
                label="Модель машины"
                value={carDataForm.model}
                onChangeText={(text) => setCarDataForm({ ...carDataForm, model: text })}
                onRightIconPress={() => {}}
            />

            <OutlinedFilledLabelInput
                label="Цвет машины"
                value={carDataForm.color}
                onChangeText={(text) => setCarDataForm({ ...carDataForm, color: text })}
                onRightIconPress={() => {}}
            />

            <OutlinedFilledLabelInput
                label="Гос. номер машины"
                value={carDataForm.plateNumber}
                onChangeText={(text) => setCarDataForm({ ...carDataForm, plateNumber: text.toUpperCase() })}
                autoCapitalize="characters"
                onRightIconPress={() => {}}
            />

            <View style={styles.buttonContainer}>
                <MyButton
                    title="Сохранить данные машины"
                    onPress={saveCarData}
                    variant="contained"
                    loading={carDataLoading}
                />
            </View>
        </KeyboardAwareScrollView>
    </View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#292D32',
        marginTop: 8
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#868382',
        marginTop: 4,
        marginBottom: 8
    }
});

export default ChangeData