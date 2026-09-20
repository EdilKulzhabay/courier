import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

type Props = {
  visible: boolean;
  onUpdate: () => void;
  onRemindLater: () => void;
};

const NewVersionModal: React.FC<Props> = ({
  visible,
  onUpdate,
  onRemindLater,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRemindLater}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Доступна новая версия приложения!</Text>
          <Text style={styles.subtitle}>
            Мы улучшили производительность и добавили новые функции, чтобы
            делать доставки ещё удобнее.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onUpdate}>
            <Text style={styles.primaryBtnText}>Обновить приложение</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onRemindLater}>
            <Text style={styles.secondaryBtnText}>Напомнить позже</Text>
          </TouchableOpacity>
          <Text style={styles.note}>
            Текущая версия может работать некорректно
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 46,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#101010',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#6A7282',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: '#DC1818',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 4,
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: '#DC1818',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
  },
});

export default NewVersionModal;
