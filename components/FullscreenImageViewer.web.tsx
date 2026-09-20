import { Image, Modal, Pressable, StyleSheet, View } from "react-native";

interface FullscreenImageViewerProps {
    images: { uri: string }[];
    imageIndex: number;
    visible: boolean;
    onRequestClose: () => void;
}

// react-native-image-viewing не поддерживает web-платформу (нет .web.js реализации
// ImageItem), поэтому здесь простой просмотр без зума — только для нативных
// платформ (см. FullscreenImageViewer.tsx) доступен полноценный зум.
export default function FullscreenImageViewer({
    images,
    imageIndex,
    visible,
    onRequestClose,
}: FullscreenImageViewerProps) {
    const image = images[imageIndex];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <Pressable style={styles.overlay} onPress={onRequestClose}>
                {image ? (
                    <View style={styles.container}>
                        <Image source={{ uri: image.uri }} style={styles.image} resizeMode="contain" />
                    </View>
                ) : null}
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    container: {
        width: "100%",
        height: "80%",
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
