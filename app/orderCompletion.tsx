import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Platform, Modal, Pressable, TextInput, Switch } from "react-native";
import { apiService } from "../api/services";
import { useEffect, useState } from "react";
import MyButton from "@/components/MyButton";
import { getCourierData, removeNeedCallVisitedOrderId } from "../utils/storage";

const BOTTLE_SALE_PRICE_19 = 3500;
const BOTTLE_SALE_PRICE_12 = 2500;

const OrderCompletion = () => {
    const { formData } = useLocalSearchParams();
    const router = useRouter();
    const [step, setStep] = useState<number>(1);
    const [count12, setCount12] = useState<number>(0);
    const [count19, setCount19] = useState<number>(0);
    const [emptyCount12, setEmptyCount12] = useState<number>(0);
    const [emptyCount19, setEmptyCount19] = useState<number>(0);
    const [price12, setPrice12] = useState<number>(0);
    const [price19, setPrice19] = useState<number>(0);
    const [opForm, setOpForm] = useState<string>("");
    const [orderId, setOrderId] = useState<string>("");
    const [products, setProducts] = useState<{b12: number, b19: number}>({b12: 0, b19: 0});
    const [kaspiQrLoading, setKaspiQrLoading] = useState(false);
    const [kaspiQrImageUrl, setKaspiQrImageUrl] = useState<string | null>(null);
    const [cashLoading, setCashLoading] = useState(false);
    const [checkPaymentLoading, setCheckPaymentLoading] = useState(false);
    const [completeOrderLoading, setCompleteOrderLoading] = useState(false);
    const [step1Loading, setStep1Loading] = useState(false);
    const [paymentModalType, setPaymentModalType] = useState<'paid' | 'unpaid' | null>(null);
    const [refreshQrLoading, setRefreshQrLoading] = useState(false);
    const [bottleSaleEnabled, setBottleSaleEnabled] = useState(false);

    const bottleSaleExtra = bottleSaleEnabled
        ? Math.max(0, count19 - emptyCount19) * BOTTLE_SALE_PRICE_19 + Math.max(0, count12 - emptyCount12) * BOTTLE_SALE_PRICE_12
        : 0;
    const basePaymentAmount = opForm === "fakt" ? price12 * count12 + price19 * count19 : 0;
    const paymentAmount = basePaymentAmount + bottleSaleExtra;

    const loadKaspiQr = async (forceRefresh = false) => {
        if (!orderId) {
            return false;
        }

        setKaspiQrLoading(true);
        if (forceRefresh) {
            setKaspiQrImageUrl(null);
        }

        try {
            const res = await apiService.createOrderKaspiQr(orderId, paymentAmount, forceRefresh);
            const qrImageUrl = typeof res?.invoice?.qrImageUrl === 'string'
                ? res.invoice.qrImageUrl.trim()
                : '';

            if (!res?.success || !qrImageUrl) {
                Alert.alert('Ошибка', res?.message || 'Не удалось создать Kaspi QR');
                return false;
            }

            setKaspiQrImageUrl(qrImageUrl);
            return true;
        } catch {
            Alert.alert('Ошибка', 'Не удалось создать Kaspi QR');
            return false;
        } finally {
            setKaspiQrLoading(false);
        }
    };

    const finishOrder = async (paymentOpForm?: string) => {
        const courier = await getCourierData();
        if (!courier || !orderId) {
            Alert.alert('Ошибка', 'Не удалось получить данные курьера');
            return false;
        }

        const res = await apiService.completeOrder(
            orderId,
            courier._id,
            count12,
            count19,
            emptyCount12,
            emptyCount19,
            paymentOpForm,
        );

        if (!res.success) {
            Alert.alert('Ошибка', res.message || 'Не удалось завершить заказ');
            return false;
        }

        await removeNeedCallVisitedOrderId(orderId);
        return true;
    };

    const handleContinueFromStep1 = async () => {
        if (opForm === "fakt" || bottleSaleExtra > 0) {
            setStep(2);
            return;
        }

        setStep1Loading(true);
        try {
            const success = await finishOrder(opForm || undefined);
            if (success) {
                router.replace('./main' as any);
            }
        } finally {
            setStep1Loading(false);
        }
    };

    const handleAcceptCash = async () => {
        setCashLoading(true);
        try {
            // Если исходная форма оплаты не "наличные" — мы здесь только из-за доплаты за бутыли,
            // итоговая форма оплаты заказа не должна меняться.
            const success = await finishOrder(opForm === "fakt" ? 'fakt' : opForm);
            if (success) {
                router.replace('./main' as any);
            }
        } finally {
            setCashLoading(false);
        }
    };

    const handleCheckPayment = async () => {
        if (!orderId) {
            return;
        }

        setCheckPaymentLoading(true);
        try {
            const res = await apiService.checkOrderKaspiQr(orderId);
            if (!res?.success) {
                Alert.alert('Ошибка', res?.message || 'Не удалось проверить оплату');
                return;
            }

            const status = String(res?.invoice?.status || '').toLowerCase();
            if (status === 'paid') {
                setPaymentModalType('paid');
            } else {
                setPaymentModalType('unpaid');
            }
        } catch {
            Alert.alert('Ошибка', 'Не удалось проверить оплату');
        } finally {
            setCheckPaymentLoading(false);
        }
    };

    const handleGoToMainAfterPayment = async () => {
        setCompleteOrderLoading(true);
        try {
            // Аналогично handleAcceptCash: opForm меняем на "qr" только если заказ изначально был "наличными".
            const success = await finishOrder(opForm === "fakt" ? "qr" : opForm);
            if (success) {
                setPaymentModalType(null);
                router.replace('./main' as any);
            }
        } finally {
            setCompleteOrderLoading(false);
        }
    };

    const handleRefreshQrCode = async () => {
        setRefreshQrLoading(true);
        try {
            const success = await loadKaspiQr(true);
            if (success) {
                setPaymentModalType(null);
            }
        } finally {
            setRefreshQrLoading(false);
        }
    };

    useEffect(() => {
        const formDataParsed = JSON.parse(formData as string);
        console.log("formDataParsed = ", formDataParsed);
        setCount12(formDataParsed?.products?.b12 ? formDataParsed?.products?.b12 : 0);
        setCount19(formDataParsed?.products?.b19 ? formDataParsed?.products?.b19 : 0);
        setEmptyCount12(formDataParsed?.products?.b12 ? formDataParsed?.products?.b12 : 0);
        setEmptyCount19(formDataParsed?.products?.b19 ? formDataParsed?.products?.b19 : 0);
        setPrice12(formDataParsed?.price12 ? formDataParsed?.price12 : 0);
        setPrice19(formDataParsed?.price19 ? formDataParsed?.price19 : 0);
        setOpForm(formDataParsed?.opForm ? formDataParsed?.opForm : "");
        setOrderId(formDataParsed?.orderId ? formDataParsed?.orderId : "");
        setProducts(formDataParsed?.products ? formDataParsed?.products : {b12: 0, b19: 0});
    }, []);

    useEffect(() => {
        if (step !== 2 || !orderId || paymentAmount <= 0) {
            return;
        }

        loadKaspiQr(false);
    }, [step, orderId, paymentAmount]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back() as any} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Завершение заказа</Text>
            </View>

            <View style={styles.content}>
                <ScrollView style={styles.scrollView}>
                    {/* <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '60%',
                        justifyContent: 'center',
                        marginHorizontal: 'auto',
                    }}>
                        <View style={{
                            width: 30,
                            height: 30,
                            backgroundColor: '#DC1818',
                            borderRadius: 100,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#fff',
                            }}>1</Text>
                        </View>
                        <View style={{
                            height: 5,
                            backgroundColor: '#E3E3E3',
                            width: '100%',
                        }}>
                            <View style={{
                                height: 5,
                                backgroundColor: '#DC1818',
                                width: step === 1 ? '50%' : '100%',
                            }}></View>
                        </View>
                        <View style={{
                            width: 30,
                            height: 30,
                            backgroundColor: step === 2 ? '#DC1818' : '#E3E3E3',
                            borderRadius: 100,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: step === 2 ? '#fff' : '#333',
                            }}>2</Text>
                        </View>
                    </View>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '90%',
                        justifyContent: 'space-between',
                        marginHorizontal: 'auto',
                        marginTop: 4,
                    }}>
                        <Text style={{fontSize: 14, fontWeight: '500', color: '#DC1818'}}>Доставка</Text>
                        <Text style={{fontSize: 14, fontWeight: '500', color: step === 2 ? '#DC1818' : '#E3E3E3'}}>Оплата</Text>
                    </View> */}

                    {step === 1 && (
                        <>
                            <Text style={{fontSize: 16, fontWeight: '500', color: '#292D32'}}>Шаг 1. Подтвердите доставку</Text>
                            <Text style={{fontSize: 13, fontWeight: '400', color: '#7d7d7f', marginTop: 8}}>Укажите, сколько бутылей передали клиенту и сколько пустых получили обратно</Text>
                            <View style={styles.section}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Image source={require("../assets/images/fullBottle.png")} style={{width: 30, height: 48}} resizeMode='contain' />
                                    <View style={{marginLeft: 12}}>
                                        <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32'}}>Передано клиенту</Text>
                                        <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>Количество полных бутылей</Text>
                                    </View>
                                </View>

                                {products?.b12 > 0 && (
                                    <>
                                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12}}>
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32', marginLeft: 8}}>12л</Text>
                                            </View>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 24}}>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (count12 > 0) {
                                                            setCount12(count12 - 1);
                                                        }
                                                    }}
                                                    disabled={count12 === 0}
                                                    style={{padding: 8, borderRadius: 100, backgroundColor: '#E3E3E3'}}
                                                >
                                                    <Image source={require("../assets/images/minus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                                </TouchableOpacity>
                                                <TextInput 
                                                    value={count12.toString()}
                                                    onChangeText={(text) => setCount12(parseInt(text))}
                                                    style={{width: 40, textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#292D32'}} 
                                                />
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (count12 < products?.b12) {
                                                            setCount12(count12 + 1);
                                                        }
                                                    }}
                                                    disabled={count12 === products?.b12}
                                                    style={{padding: 8, borderRadius: 100, backgroundColor: count12 === products?.b12 ? '#E3E3E3' : '#DC1818'}}
                                                >
                                                    <Image source={require("../assets/images/plus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={{height: 1, backgroundColor: '#E3E3E3', marginVertical: 12, width: '100%' }} />
                                    </>
                                )}
                                {products?.b19 > 0 && (
                                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: products?.b12 === 0 ? 12 : 0}}>
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32', marginLeft: 8}}>19л</Text>
                                        </View>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 24}}>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (count19 > 0) {
                                                        setCount19(count19 - 1);
                                                    }
                                                }}
                                                disabled={count19 === 0}
                                                style={{padding: 8, borderRadius: 100, backgroundColor: "#E3E3E3"}}
                                            >
                                                <Image source={require("../assets/images/minus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                            </TouchableOpacity>
                                            <TextInput 
                                                value={count19.toString()}
                                                onChangeText={(text) => setCount19(parseInt(text))}
                                                style={{width: 40, textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#292D32'}} 
                                            />
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (count19 < products?.b19) {
                                                        setCount19(count19 + 1);
                                                    }
                                                }}
                                                disabled={count19 === products?.b19}
                                                style={{padding: 8, borderRadius: 100, backgroundColor: count19 === products?.b19 ? '#E3E3E3' : '#DC1818'}}
                                            >
                                                <Image source={require("../assets/images/plus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={styles.section}>
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    <Image source={require("../assets/images/emptyBottle.png")} style={{width: 30, height: 48}} resizeMode='contain' />
                                    <View style={{marginLeft: 12}}>
                                        <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32'}}>Получено пустых</Text>
                                        <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>Количество пустых бутылей</Text>
                                    </View>
                                </View>

                                {products?.b12 > 0 && (
                                    <>
                                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12}}>
                                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                                <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32', marginLeft: 8}}>12л</Text>
                                            </View>
                                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 24}}>
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (emptyCount12 > 0) {
                                                            setEmptyCount12(emptyCount12 - 1);
                                                        }
                                                    }}
                                                    disabled={emptyCount12 === 0}
                                                    style={{padding: 8, borderRadius: 100, backgroundColor: '#E3E3E3'}}
                                                >
                                                    <Image source={require("../assets/images/minus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                                </TouchableOpacity>
                                                <TextInput 
                                                    value={emptyCount12.toString()}
                                                    onChangeText={(text) => setEmptyCount12(parseInt(text))}
                                                    style={{width: 40, textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#292D32'}} 
                                                />
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (emptyCount12 < products?.b12) {
                                                            setEmptyCount12(emptyCount12 + 1);
                                                        }
                                                    }}
                                                    disabled={emptyCount12 === products?.b12}
                                                    style={{padding: 8, borderRadius: 100, backgroundColor: emptyCount12 === products?.b12 ? '#E3E3E3' : '#DC1818'}}
                                                >
                                                    <Image source={require("../assets/images/plus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <View style={{height: 1, backgroundColor: '#E3E3E3', marginVertical: 12, width: '100%' }} />
                                    </>
                                )}

                                {products?.b19 > 0 && (
                                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: products?.b12 === 0 ? 12 : 0}}>
                                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                            <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32', marginLeft: 8}}>19л</Text>
                                        </View>
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 24}}>
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (emptyCount19 > 0) {
                                                        setEmptyCount19(emptyCount19 - 1);
                                                    }
                                                }}
                                                disabled={emptyCount19 === 0}
                                                style={{padding: 8, borderRadius: 100, backgroundColor: "#E3E3E3"}}
                                            >
                                                <Image source={require("../assets/images/minus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                            </TouchableOpacity>
                                            <TextInput 
                                                value={emptyCount19.toString()}
                                                onChangeText={(text) => setEmptyCount19(parseInt(text))}
                                                style={{width: 40, textAlign: 'center', fontSize: 14, fontWeight: '500', color: '#292D32'}} 
                                            />
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    if (emptyCount19 < products?.b19) {
                                                        setEmptyCount19(emptyCount19 + 1);
                                                    }
                                                }}
                                                disabled={emptyCount19 === products?.b19}
                                                style={{padding: 8, borderRadius: 100, backgroundColor: emptyCount19 === products?.b19 ? '#E3E3E3' : '#DC1818'}}
                                            >
                                                <Image source={require("../assets/images/plus.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderWidth: 1,
                                borderColor: '#E3E3E3',
                                padding: 12,
                                borderRadius: 8,
                                marginTop: 12,
                            }}>
                                <View style={{flex: 1, marginRight: 12}}>
                                    <Text style={{fontSize: 14, fontWeight: '500', color: '#292D32'}}>Продажа бутылей</Text>
                                </View>
                                <Switch
                                    value={bottleSaleEnabled}
                                    onValueChange={setBottleSaleEnabled}
                                    trackColor={{false: '#E3E3E3', true: '#DC1818'}}
                                    thumbColor="#fff"
                                />
                            </View>

                            {bottleSaleExtra > 0 && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    backgroundColor: "#FEF2F2",
                                    padding: 12,
                                    borderRadius: 8,
                                    marginTop: 12,
                                }}>
                                    <Text style={{fontSize: 13, fontWeight: '500', color: '#DC1818'}}>
                                        Доплата за бутыли
                                    </Text>
                                    <Text style={{fontSize: 15, fontWeight: '700', color: '#DC1818'}}>
                                        {bottleSaleExtra} ₸
                                    </Text>
                                </View>
                            )}

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: "#f4f5fa",
                                padding: 12,
                                borderRadius: 8,
                                marginTop: 12,
                                marginBottom: 24,
                                gap: 12,
                            }}>
                                <Image source={require("../assets/images/info.png")} style={{width: 30, height: 30}} resizeMode='contain' />
                                <View>
                                    <Text style={{fontSize: 12, fontWeight: '500', color: '#223755'}}>
                                        Проверьте данные перед переходом к оплате.
                                    </Text>
                                    <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>
                                        Эту информацию потом нельзя будет изменить.
                                    </Text>
                                </View>
                            </View>

                            <MyButton
                                title={(opForm === "fakt" || bottleSaleExtra > 0) ? "Перейти к оплате" : "Завершить заказ"}
                                onPress={handleContinueFromStep1}
                                variant="contained"
                                width="full"
                                loading={step1Loading}
                            />
                            <View style={{height: 30}} />
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Text style={{fontSize: 16, fontWeight: '500', color: '#292D32'}}>Шаг 2. Оплата заказа</Text>
                            <Text style={{fontSize: 13, fontWeight: '400', color: '#7d7d7f', marginTop: 8}}>
                                {opForm === "fakt"
                                    ? "Покажите QR-код клиенту для оплаты."
                                    : "Покажите QR-код клиенту для оплаты доплаты за бутыли."}
                            </Text>

                            <View style={styles.section}>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f'}}>
                                    Сумма к оплате
                                </Text>
                                <Text style={{fontSize: 24, fontWeight: '600', color: '#000', marginTop: 2}}>
                                    {paymentAmount} ₸
                                </Text>
                            </View>

                            <View style={[styles.section, {marginTop: 0, alignItems: 'center'}]}>
                                <Text style={{fontSize: 14, fontWeight: '500', color: '#000'}}>
                                    QR-код для оплаты
                                </Text>
                                <Text style={{fontSize: 12, fontWeight: '400', color: '#7d7d7f', marginTop: 2, textAlign: 'center', width: '80%'}}>
                                    Попросите клиента отсканировать QR-код для оплаты.
                                </Text>

                                <View style={styles.kaspiQrContainer}>
                                    {kaspiQrLoading ? (
                                        <ActivityIndicator size="large" color="#DC1818" style={styles.kaspiLoader} />
                                    ) : kaspiQrImageUrl ? (
                                        <Image
                                            source={{ uri: kaspiQrImageUrl }}
                                            style={styles.kaspiQrImage}
                                            resizeMode="contain"
                                        />
                                    ) : null}
                                </View>

                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                    <Image source={require("../assets/images/clockBlack.png")} style={{width: 16, height: 16}} resizeMode='contain' />
                                    <Text style={{fontSize: 12, fontWeight: '400', color: '#000'}}>
                                        QR-код действителен 10 минут.
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleAcceptCash}
                                disabled={cashLoading || checkPaymentLoading || completeOrderLoading}
                                style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#DC1818',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    opacity: cashLoading ? 0.7 : 1,
                                }}
                            >
                                {cashLoading ? (
                                    <ActivityIndicator size="small" color="#DC1818" />
                                ) : (
                                    <Image source={require("../assets/images/cash.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                )}
                                <Text style={{fontSize: 14, fontWeight: '500', color: '#DC1818'}}>
                                    Принять наличные
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleCheckPayment}
                                disabled={cashLoading || checkPaymentLoading || completeOrderLoading}
                                style={{
                                    padding: 12,
                                    borderRadius: 8,
                                    backgroundColor: '#DC1818',
                                    marginTop: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    opacity: checkPaymentLoading ? 0.7 : 1,
                                }}
                            >
                                {checkPaymentLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Image source={require("../assets/images/verified.png")} style={{width: 20, height: 20}} resizeMode='contain' />
                                )}
                                <Text style={{fontSize: 14, fontWeight: '400', color: '#fff'}}>
                                    Проверить оплату
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>

            <Modal
                visible={paymentModalType === 'paid'}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPaymentModalType(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Заказ оплачен</Text>
                        <Text style={{fontSize: 14, color: '#545454', textAlign: 'center', marginBottom: 20}}>
                            Клиент успешно оплатил заказ. Можно завершить доставку.
                        </Text>
                        <MyButton
                            title="На главную"
                            onPress={handleGoToMainAfterPayment}
                            variant="contained"
                            width="full"
                            loading={completeOrderLoading}
                        />
                    </View>
                </View>
            </Modal>

            <Modal
                visible={paymentModalType === 'unpaid'}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPaymentModalType(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Счёт не оплачен</Text>
                        <Text style={{fontSize: 14, color: '#545454', textAlign: 'center', marginBottom: 20}}>
                            Клиент ещё не оплатил счёт. Попросите его отсканировать QR-код и попробуйте снова.
                        </Text>
                        <MyButton
                            title="Обновить QR-код"
                            onPress={handleRefreshQrCode}
                            variant="contained"
                            width="full"
                            loading={refreshQrLoading}
                        />
                        <View style={{ height: 12 }} />
                        <MyButton
                            title="Понятно"
                            onPress={() => setPaymentModalType(null)}
                            variant="outlined"
                            width="full"
                        />
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    section: {
        marginTop: 12,
        borderWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E3E3E3',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        backgroundColor: 'white',
        alignItems: 'center',
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
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 50,
    },
    quickMessagesContainer: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    quickMessage: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        fontSize: 14,
        fontWeight: '400',
        borderWidth: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalButton: {
        backgroundColor: '#DC1818',
        padding: 12,
        borderRadius: 8,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
    },
    kaspiQrContainer: {
        marginVertical: 16,
        minHeight: 260,
        alignItems: 'center',
        justifyContent: 'center',
    },
    kaspiQrImage: {
        width: 260,
        height: 260,
    },
    kaspiLoader: {
        marginVertical: 32,
    },
});

export default OrderCompletion;