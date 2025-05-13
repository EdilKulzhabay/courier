import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { apiService } from "../api/services"
import MyButton from "../components/MyButton"
import { CourierData } from "../types/interfaces"
import { updateCourierData } from "../utils/storage"

const Analytics = () => {
    const router = useRouter();

    const [courier, setCourier] = useState<CourierData | null>(null);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        await updateCourierData(courierData.userData);
        if (courierData.success) {
            setCourier(courierData.userData);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCourierData();
        }, [])
    );

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

            <View style={styles.incomeCard}>
            <View>
                <Text style={styles.incomeTitle}>Доступно к выплате:</Text>
            </View>

            <View style={styles.incomeAmount}>
                <View style={styles.incomeRow}>
                <Text style={styles.incomeValue}>{courier?.income}</Text>
                <Text style={styles.incomeCurrency}>₸</Text>
                </View>
            </View>
            </View>

            <View style={styles.withdrawButton}>
                <MyButton 
                    title="Вывести на карту"
                    onPress={() => {}}
                    variant="outlined"
                    width="full"
                />
            </View>

            <View style={styles.analyticBlocks}>
                <TouchableOpacity
                    onPress={() => {router.push("/deliveredBottles" as any)}}
                    style={styles.analyticBlock}
                >
                    <Image 
                        source={require("../assets/images/timer.png")}
                        style={styles.analyticBlockIcons}
                        resizeMode="contain"
                    />

                    <Text style={{ marginTop: 12, fontSize: 12 }}>Доставлено бутылей</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {router.push("/history" as any)}}
                    style={styles.analyticBlock}
                >
                    <Image 
                        source={require("../assets/images/clock.png")}
                        style={styles.analyticBlockIcons}
                        resizeMode="contain"
                    />

                    <Text style={{ marginTop: 12, fontSize: 12 }}>История заказов</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {router.push("/finance" as any)}}
                    style={styles.analyticBlock}
                >
                    <Image 
                        source={require("../assets/images/finance.png")}
                        style={styles.analyticBlockIcons}
                        resizeMode="contain"
                    />

                    <Text style={{ marginTop: 12, fontSize: 12 }}>Финансы</Text>
                </TouchableOpacity>
            </View>
        </View>
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
    content: {
        paddingHorizontal: 24
    },
    incomeCard: {
        marginTop: 16,
        backgroundColor: '#DADADA',
        borderRadius: 16,
        padding: 16
    },
    incomeTitle: {
        fontSize: 14
    },
    incomeAmount: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    incomeRow: {
        flexDirection: 'row'
    },
    incomeValue: {
        fontSize: 32,
        fontWeight: '500'
    },
    incomeCurrency: {
        fontSize: 32,
        fontWeight: '500',
        marginLeft: 12
    },
    withdrawButton: {
        marginTop: 16
    },
    analyticBlocks: {
        flexDirection: 'row',   
        marginTop: 16,
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
    },
    analyticBlock: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignSelf: 'stretch'
    },
    analyticBlockIcons: {
        width: 24,
        height: 24
    }
});

export default Analytics