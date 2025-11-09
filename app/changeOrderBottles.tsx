import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { apiService } from "../api/services"
import MyButton from "../components/MyButton"
import { CourierData, Order } from "../types/interfaces"
import { getCourierData } from "../utils/storage"

const ChangeOrderBottles = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Парсим formData для получения всех параметров
    const formData = params.formData ? JSON.parse(params.formData as string) : null;
    const isFinish = formData?.isFinish || false;
    const orderId = formData?.orderId;
    const income = formData?.income;
    const products = formData?.products;
    
    // Для обратной совместимости, если order передан напрямую
    const order = params.order ? JSON.parse(params.order as string) as Order : null;

    const [courier, setCourier] = useState<CourierData | null>(null);
    const [bottleCount12, setBottleCount12] = useState(0);
    const [bottleCount19, setBottleCount19] = useState(0);
    const [completeOrderLoading, setCompleteOrderLoading] = useState(false);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        console.log("we in changeOrderBottles = ", courierData?.userData);
        
        setCourier(courierData?.userData)
        
        // Если isFinish=true, используем переданные продукты, иначе данные из API
        if (isFinish && products) {
            setBottleCount12(products.b12 || 0);
            setBottleCount19(products.b19 || 0);
        } else {
            setBottleCount12(courierData?.userData?.order?.products?.b12 || 0);
            setBottleCount19(courierData?.userData?.order?.products?.b19 || 0);
        }
    };

    useEffect(() => {
        fetchCourierData()
    }, [])

    const handleIncrement = () => {
        setBottleCount12((prev: number) => prev + 1);
    };

    const handleDecrement = () => {
        if (bottleCount12 > 0) {
            setBottleCount12((prev: number) => prev - 1);
        }
    };

    const handleSave = async () => {
        try {
            const products = {
                b12: bottleCount12,
                b19: bottleCount19
            }
            if (courier && courier._id) {
                const res = await apiService.updateData(courier._id, "order.products", products)
                if (res.success) {
                    Alert.alert("Успешно", "Данные успешно изменены")
                }
            }
        } catch (error) {
            console.error('Ошибка при обновлении бутылей:', error);
            Alert.alert('Ошибка', 'Произошла ошибка при обновлении данных');
        }
    };

    const completeOrder = async () => {
        setCompleteOrderLoading(true);
        const courier = await getCourierData();
        if (courier && orderId) {
            const res = await apiService.completeOrder(orderId, courier._id, bottleCount12, bottleCount19);
            if (res.success) {
                const income = res.income;
                router.push({
                    pathname: '/success' as any,
                    params: { formData: JSON.stringify(income) }
                });
            }
        }
        setCompleteOrderLoading(false);
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
            <Text style={styles.headerTitle}>Изменить количество бутылей</Text>
        </View>

        <View style={styles.content}>
            <View style={styles.bottleCounter}>
                <Text style={styles.counterTitle}>Количество бутылей 12.5</Text>
                <View style={styles.counterControls}>
                    <TouchableOpacity 
                        style={[styles.counterButton, bottleCount12 === 0 && styles.counterButtonDisabled]} 
                        onPress={() => {
                            if (bottleCount12 > 0) {
                                setBottleCount12((prev: number) => prev - 1);
                            }
                        }}
                        disabled={bottleCount12 === 0}
                    >
                        <Text style={styles.counterButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{bottleCount12}</Text>
                    <TouchableOpacity 
                        style={styles.counterButton} 
                        onPress={() => {setBottleCount12((prev: number) => prev + 1);}}
                    >
                        <Text style={styles.counterButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.bottleCounter}>
                <Text style={styles.counterTitle}>Количество бутылей 18.9</Text>
                <View style={styles.counterControls}>
                    <TouchableOpacity 
                        style={[styles.counterButton, bottleCount19 === 0 && styles.counterButtonDisabled]} 
                        onPress={() => {
                            if (bottleCount19 > 0) {
                                setBottleCount19((prev: number) => prev - 1);
                            }
                        }}
                        disabled={bottleCount19 === 0}
                    >
                        <Text style={styles.counterButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{bottleCount19}</Text>
                    <TouchableOpacity 
                        style={styles.counterButton} 
                        onPress={() => {setBottleCount19((prev: number) => prev + 1);}}
                    >
                        <Text style={styles.counterButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {!isFinish ? (
                <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Сохранить</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.finishContainer}>
                    <Text style={styles.confirmationText}>
                        Правильно ли указано количество бутылей?
                    </Text>
                    <View style={styles.confirmButton}>
                        <MyButton
                            title="Подтвердить"
                            onPress={completeOrder}
                            variant="contained"
                            width="full"
                            loading={completeOrderLoading}
                        />
                    </View>
                </View>
            )}
        </View>
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
        paddingHorizontal: 24
    },
    bottleCounter: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginTop: 16
    },
    counterTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#292D32',
        marginBottom: 16
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24
    },
    counterButton: {
        width: 48,
        height: 48,
        backgroundColor: '#DC3F34',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    counterButtonDisabled: {
        backgroundColor: '#DADADA'
    },
    counterButtonText: {
        color: 'white',
        fontSize: 24,
        fontWeight: '500'
    },
    counterValue: {
        fontSize: 32,
        fontWeight: '500',
        color: '#292D32',
        minWidth: 60,
        textAlign: 'center'
    },
    saveButton: {
        backgroundColor: '#DC3F34',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500'
    },
    finishContainer: {
        marginTop: 24,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center'
    },
    confirmationText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#292D32',
        textAlign: 'center',
        marginBottom: 20
    },
    confirmButton: {
        marginTop: 8
    }
});

export default ChangeOrderBottles