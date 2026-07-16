import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { apiService } from "../api/services"
import MyButton from "../components/MyButton"
import { getLastWithdrawalTime, saveLastWithdrawalTime, updateCourierData } from "../utils/storage"

const WITHDRAW_COOLDOWN_MS = 60 * 60 * 1000;

const formatCooldownRemaining = (ms: number): string => {
    const totalMinutes = Math.ceil(ms / 60000);
    if (totalMinutes <= 1) {
        return "меньше минуты";
    }
    if (totalMinutes < 60) {
        return `${totalMinutes} мин`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
};

const Analytics = () => {
    const router = useRouter();

    const [availableIncome, setAvailableIncome] = useState(0);
    const [incomeLoading, setIncomeLoading] = useState(true);
    const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [cashIncome, setCashIncome] = useState(0);
    const [income, setIncome] = useState(0);
    const [lastWithdrawalTime, setLastWithdrawalTime] = useState<number | null>(null);
    const [isCooldownModalVisible, setIsCooldownModalVisible] = useState(false);
    const [cooldownMessage, setCooldownMessage] = useState("");

    const loadAnalytics = async () => {
        setIncomeLoading(true);

        try {
            const courierData = await apiService.getData();
            if (!courierData.success || !courierData.userData) {
                setAvailableIncome(0);
                return;
            }

            await updateCourierData(courierData.userData);
            setAvailableIncome(Number(courierData.userData.income) || 0);
        } catch {
            setAvailableIncome(0);
        } finally {
            setIncomeLoading(false);
        }
    };

    const getIncome = async () => {
        const res = await apiService.getIncome();
        if (res?.success) {
            setIncome(Number(res.income) || 0);
        }
    };

    const getCashIncome = async () => {
        const res = await apiService.getCashIncome();
        if (res?.success) {
            setCashIncome(Number(res.cashIncome) || 0);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAnalytics();
            getIncome();
            getCashIncome();
        }, [])
    );

    useEffect(() => {
        getLastWithdrawalTime().then(setLastWithdrawalTime);
    }, []);

    const getCooldownRemainingMs = () => {
        if (!lastWithdrawalTime) {
            return 0;
        }
        return WITHDRAW_COOLDOWN_MS - (Date.now() - lastWithdrawalTime);
    };

    const handleOpenWithdrawModal = () => {
        const remainingMs = getCooldownRemainingMs();
        if (remainingMs > 0) {
            setCooldownMessage(
                `Вывод средств доступен не чаще одного раза в час. Попробуйте снова через ${formatCooldownRemaining(remainingMs)}.`
            );
            setIsCooldownModalVisible(true);
            return;
        }

        setWithdrawAmount("");
        setIsWithdrawModalVisible(true);
    };

    const handleConfirmWithdraw = async () => {
        const remainingMs = getCooldownRemainingMs();
        if (remainingMs > 0) {
            setIsWithdrawModalVisible(false);
            setCooldownMessage(
                `Вывод средств доступен не чаще одного раза в час. Попробуйте снова через ${formatCooldownRemaining(remainingMs)}.`
            );
            setIsCooldownModalVisible(true);
            return;
        }

        const amount = Number(withdrawAmount.trim());

        if (!withdrawAmount.trim() || isNaN(amount) || amount <= 0) {
            Alert.alert("Ошибка", "Введите корректную сумму");
            return;
        }

        if (amount > availableIncome) {
            Alert.alert("Ошибка", "Сумма не может превышать доступный баланс");
            return;
        }

        setWithdrawLoading(true);
        try {
            const res = await apiService.requestWithdrawal(amount);

            if (res?.success) {
                const now = Date.now();
                setLastWithdrawalTime(now);
                await saveLastWithdrawalTime(now);
                setIsWithdrawModalVisible(false);
                setWithdrawAmount("");
                Alert.alert("Готово", "Запрос на вывод отправлен");
            } else {
                Alert.alert("Ошибка", res?.message || "Не удалось отправить запрос");
            }
        } catch {
            Alert.alert("Ошибка", "Не удалось отправить запрос");
        } finally {
            setWithdrawLoading(false);
        }
    };

    return <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Image
                    source={require("../assets/images/arrowBack.png")}
                    style={styles.backIcon}
                    resizeMode="contain"
                />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Аналитика</Text>
        </View>

        <View style={styles.content}>

            <View style={[styles.incomeCard, {backgroundColor: '#f4f9f3', borderColor: '#d1eccb', borderWidth: 1}]}>
                <View style={{
                    backgroundColor: "#e3f2df",
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Image source={require("../assets/images/wallet.png")} style={{width: 40, height: 40}} resizeMode="contain" />
                </View>
                <View>
                    <View>
                        <Text style={[styles.incomeTitle]}>Заработано сегодня</Text>
                    </View>

                    <View style={styles.incomeAmount}>
                        {incomeLoading ? (
                            <ActivityIndicator size="large" color="#fff" />
                        ) : (
                            <Text style={[styles.incomeValue, {color: "#439749"}]}>{income} ₸</Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={[styles.incomeCard, {backgroundColor: '#fdf8f4', borderColor: '#f5ebe3', borderWidth: 1}]}>
                <View style={{
                    backgroundColor: "#feeddd",
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Image source={require("../assets/images/orangeCash.png")} style={{width: 40, height: 40}} resizeMode="contain" />
                </View>
                <View>
                    <View>
                        <Text style={[styles.incomeTitle]}>Получено наличными сегодня</Text>
                    </View>

                    <View style={styles.incomeAmount}>
                        {incomeLoading ? (
                            <ActivityIndicator size="large" color="#fff" />
                        ) : (
                            <Text style={[styles.incomeValue, {color: "#F8991C"}]}>{cashIncome} ₸</Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={{
                backgroundColor: '#fbf2f3', 
                borderColor: '#f5e5e6', 
                borderWidth: 1, 
                marginTop: 16,
                borderRadius: 16,
                padding: 16
            }}>
                <View style={{flexDirection: "row", alignItems: "center", gap: 16}}>
                    <View style={{
                        backgroundColor: "#fae4e6",
                        borderRadius: 16,
                        padding: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Image source={require("../assets/images/bigCard.png")} style={{width: 40, height: 40}} resizeMode="contain" />
                    </View>
                    <View>
                        <View>
                            <Text style={[styles.incomeTitle]}>Доступно к выплате</Text>
                        </View>

                        <View style={styles.incomeAmount}>
                            {incomeLoading ? (
                                <ActivityIndicator size="large" color="#fff" />
                            ) : (
                                <Text style={[styles.incomeValue, {color: "#DC1818"}]}>{availableIncome} ₸</Text>
                            )}
                        </View>
                    </View>
                </View>

                <Text style={{
                    color: "#868382",
                    fontSize: 12,
                    marginLeft: 70,
                    marginTop: 8
                }}>
                    Сумма к выплате станет положительной, когда заработок превысит полученные наличные
                </Text>
            </View>

            <TouchableOpacity 
                style={styles.withdrawButton}
                onPress={handleOpenWithdrawModal}
            >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Image
                        source={require("../assets/images/card.png")}
                        style={{width: 20, height: 20}}
                        resizeMode="contain"
                    />
                    <Text style={{fontSize: 16, fontWeight: '500', color: '#FB2C36', marginLeft: 12}}>Вывести на карту</Text>
                </View>
                <Image
                    source={require("../assets/images/redChevronRight.png")}
                    style={{width: 20, height: 20}}
                    resizeMode="contain"
                />
            </TouchableOpacity>

            <View style={styles.analyticBlocks}>
                <TouchableOpacity
                    onPress={() => {router.push("/deliveredBottles" as any)}}
                    style={styles.analyticBlock}
                >
                    <View style={{backgroundColor: '#FEF2F2', borderRadius: 14, width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
                        <Image 
                            source={require("../assets/images/redBottle.png")}
                            style={{width: 19, height: 28}}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={{ marginTop: 12, fontSize: 12, color: '#101828', fontWeight: '500' }}>Доставлено бутылей</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {router.push("/history" as any)}}
                    style={styles.analyticBlock}
                >
                    <View style={{backgroundColor: '#FEF2F2', borderRadius: 14, width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
                        <Image 
                            source={require("../assets/images/newClock.png")}
                            style={styles.analyticBlockIcons}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={{ marginTop: 12, fontSize: 12, color: '#101828', fontWeight: '500' }}>История заказов</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {router.push("/finance" as any)}}
                    style={styles.analyticBlock}
                >
                    <View style={{backgroundColor: '#FEF2F2', borderRadius: 14, width: 48, height: 48, alignItems: 'center', justifyContent: 'center'}}>
                        <Image 
                            source={require("../assets/images/analytics.png")}
                            style={styles.analyticBlockIcons}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={{ marginTop: 12, fontSize: 12, color: '#101828', fontWeight: '500' }}>Финансы</Text>
                </TouchableOpacity>
            </View>
        </View>

        <Modal
            visible={isWithdrawModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsWithdrawModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Вывод на карту</Text>
                    <Text style={styles.modalSubtitle}>
                        Укажите сумму для вывода
                    </Text>
                    <TextInput
                        style={styles.amountInput}
                        value={withdrawAmount}
                        onChangeText={setWithdrawAmount}
                        placeholder="Сумма, ₸"
                        placeholderTextColor="#ADADAD"
                        keyboardType="numeric"
                    />
                    <MyButton
                        title="Подтвердить"
                        onPress={handleConfirmWithdraw}
                        variant="contained"
                        width="full"
                        loading={withdrawLoading}
                    />
                    <View style={styles.modalCancelButton}>
                        <MyButton
                            title="Отмена"
                            onPress={() => setIsWithdrawModalVisible(false)}
                            variant="outlined"
                            width="full"
                        />
                    </View>
                </View>
            </View>
        </Modal>

        <Modal
            visible={isCooldownModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsCooldownModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Подождите немного</Text>
                    <Text style={styles.modalSubtitle}>
                        {cooldownMessage}
                    </Text>
                    <MyButton
                        title="Понятно"
                        onPress={() => setIsCooldownModalVisible(false)}
                        variant="contained"
                        width="full"
                    />
                </View>
            </View>
        </Modal>
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
    content: {
        paddingHorizontal: 24,
        marginTop: -20
    },
    incomeCard: {
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    incomeTitle: {
        fontSize: 12,
        fontWeight: '400'
    },
    incomeAmount: {

    },
    incomeRow: {
        flexDirection: 'row'
    },
    incomeValue: {
        fontSize: 32,
        fontWeight: '600'
    },
    incomeCurrency: {
        fontSize: 32,
        fontWeight: '500',
        marginLeft: 12
    },
    withdrawButton: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 2
    },
    analyticBlocks: {
        flexDirection: 'row',   
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    analyticBlock: {
        width: '30%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        alignSelf: 'stretch'
    },
    analyticBlockIcons: {
        width: 24,
        height: 24
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#545454',
        textAlign: 'center',
        marginBottom: 20,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: '#E3E3E3',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        marginBottom: 16,
        color: '#292D32',
    },
    modalCancelButton: {
        marginTop: 12,
    },
});

export default Analytics
