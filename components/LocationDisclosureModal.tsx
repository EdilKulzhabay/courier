import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import MyButton from './MyButton';

interface LocationDisclosureModalProps {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export default function LocationDisclosureModal({ visible, onAccept, onDecline }: LocationDisclosureModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onDecline}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Доступ к геолокации</Text>
                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        <Text style={styles.text}>
                            Приложению «Тибетская курьер» для работы необходим доступ к данным о вашем местоположении (GPS-координаты).
                        </Text>
                        <Text style={styles.text}>
                            Геолокация собирается и передаётся на сервер, пока вы находитесь на смене (в статусе «онлайн») —
                            {' '}как при открытом приложении, так и в фоновом режиме (когда экран заблокирован или приложение свёрнуто).
                        </Text>
                        <Text style={styles.text}>
                            Эти данные используются только для отслеживания маршрута доставки, подтверждения прибытия к клиенту
                            и координации заказов диспетчером. Геолокация не собирается, когда вы не на смене.
                        </Text>
                        <Text style={styles.text}>
                            Нажимая «Разрешить», вы соглашаетесь на сбор и обработку геоданных в описанных целях. Далее система
                            запросит системные разрешения на доступ к местоположению.
                        </Text>
                    </ScrollView>
                    <View style={styles.actions}>
                        <MyButton title="Не сейчас" variant="outlined" onPress={onDecline} />
                        <View style={{ height: 12 }} />
                        <MyButton title="Разрешить" variant="contained" onPress={onAccept} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#000',
    },
    body: {
        marginBottom: 16,
    },
    text: {
        fontSize: 14,
        lineHeight: 20,
        color: '#333',
        marginBottom: 10,
    },
    actions: {
        marginTop: 4,
    },
});
