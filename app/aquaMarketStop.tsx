import React, { useCallback, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { apiService } from '../api/services';
import { CourierData, Order } from '../types/interfaces';

const AquaMarketStop = () => {
    const router = useRouter();
    const [stop, setStop] = useState<Order | null>(null);
    const [courier, setCourier] = useState<CourierData | null>(null);

    const fetchCourierData = async () => {
        const courierData = await apiService.getData();
        if (courierData.success) {
            setCourier(courierData.userData);
            if (courierData.userData.order?.stopType === 'aquaMarket') {
                setStop(courierData.userData.order);
            } else {
                setStop(null);
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchCourierData();
        }, [])
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image
                        source={require("../assets/images/arrowBack.png")}
                        style={styles.backIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Поездка в аквамаркет</Text>
            </View>

            <View style={styles.content}>
                {!stop ? (
                    <Text style={{textAlign: 'center', marginTop: 20}}>Загрузка данных...</Text>
                ) : (
                    <>
                        <TouchableOpacity
                            onPress={() => {
                                Linking.openURL(stop?.aquaMarketAddressLink || '');
                            }}
                            style={styles.section}
                        >
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Image source={require("../assets/images/location.png")} style={{width: 24, height: 24}} resizeMode='contain' />
                                <View style={{marginLeft: 8}}>
                                    <Text style={{fontSize: 14, fontWeight: '400', color: '#000'}}>Адрес аквамаркета</Text>
                                    <Text style={{fontSize: 16, fontWeight: '500', color: '#292D32', marginTop: 4}}>{stop?.aquaMarketAddress ?? ''}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {(!!stop?.products?.b12 || !!stop?.products?.b19) && (
                            <View style={styles.section}>
                                <Text style={{fontSize: 14, fontWeight: '400', color: '#000'}}>Нужно забрать</Text>
                                <Text style={{fontSize: 16, fontWeight: '500', color: '#292D32', marginTop: 4}}>
                                    {[
                                        stop?.products?.b12 ? `${stop.products.b12} шт. — 12,5 л` : null,
                                        stop?.products?.b19 ? `${stop.products.b19} шт. — 18,9 л` : null,
                                    ].filter(Boolean).join(', ')}
                                </Text>
                            </View>
                        )}

                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                Поездка завершится автоматически, как только сотрудник аквамаркета отметит отдачу или приёмку бутылей по вашему аккаунту.
                            </Text>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
};

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
        paddingHorizontal: 24
    },
    section: {
        marginTop: 12,
        borderWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E3E3E3',
        padding: 12,
        borderRadius: 8
    },
    infoBox: {
        marginTop: 16,
        backgroundColor: '#f0f4fd',
        padding: 12,
        borderRadius: 8
    },
    infoText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#223755'
    }
});

export default AquaMarketStop;
