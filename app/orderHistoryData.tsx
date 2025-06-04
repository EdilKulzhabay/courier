import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const OrderHistoryData = () => {
    const router = useRouter()
    const { formData } = useLocalSearchParams();
    const order = JSON.parse(formData as string);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Заказ {order.date.d}</Text>
            </View>

            <View style={styles.contentContainer}>
                <Image
                    source={require("../assets/images/checkTop.png")}
                    style={styles.receiptTop}
                />
                <View style={styles.receiptContent}>
                    <View style={styles.receiptHeader}>
                        <Text style={styles.totalAmount}>{order.income} ₸ </Text>
                        <Text style={styles.dateText}>{order.date.d}</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Откуда:</Text>
                    <Text style={styles.addressText}>{order.aquaMarketAddress}</Text>


                    <Text style={styles.sectionTitle}>Куда:</Text>
                    <Text style={styles.addressText}>{order.address.actual}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Детали заказа:</Text>
                    {order.products.b12 > 0 && (
                        <View style={styles.productRow}>
                            <View>
                                <Text style={styles.productTitle}>Вода "Тибетская" питьевая</Text>
                                <Text style={styles.productVolume}>Объём: 12,5 л</Text>
                            </View>
                            <Text style={styles.productQuantity}>x{order.products.b12}</Text>
                        </View>
                    )}

                    {order.products.b19 > 0 && (
                        <View style={styles.productRow}>
                            <View>
                                <Text style={styles.productTitle}>Вода "Тибетская" питьевая</Text>
                                <Text style={styles.productVolume}>Объём: 18,9 л</Text>
                            </View>
                            <Text style={styles.productQuantity}>x{order.products.b19}</Text>
                        </View>
                    )}
                    
                </View>
            </View>
        </View>
    )
}   

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F7F7",
        ...Platform.select({
            android: {
                paddingTop: 38
            },
            ios: {}
        })
    },
    header: {
        flexDirection: "row",
        backgroundColor: "white",
        alignItems: "center",
        marginBottom: 24,
        padding: 24
    },
    backButton: {
        padding: 8,
        backgroundColor: "#EFEFEF",
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center"
    },
    icon: {
        width: 24,
        height: 24
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "500",
        marginLeft: 16,
        color: "#292D32"
    },
    contentContainer: {
        marginTop: 16,
        paddingHorizontal: 24
    },
    receiptTop: {
        height: 30,
        width: "100%"
    },
    receiptContent: {
        backgroundColor: "white",
        padding: 16
    },
    receiptHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 12,
        paddingRight: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E3E3E3"
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: "600"
    },
    dateText: {
        fontSize: 18,
        fontWeight: "500",
        color: "#898A8D"
    },
    sectionTitle: {
        fontSize: 18,
        marginTop: 16
    },
    addressText: {
        fontSize: 18,
        marginLeft: 8
    },
    divider: {
        width: "100%",
        height: 1,
        backgroundColor: "#E3E3E3",
        marginVertical: 16
    },
    productRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 12,
        marginTop: 16
    },
    productTitle: {
        fontSize: 18
    },
    productVolume: {
        color: "#545454"
    },
    productQuantity: {
        fontSize: 18
    }
});

export default OrderHistoryData