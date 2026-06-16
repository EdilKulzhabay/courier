import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const API_ORIGIN = "https://api.tibetskayacrm.kz";

const getImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};

const AddressImages = () => {
    const router = useRouter();
    const { addressName, images } = useLocalSearchParams();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const imageList = useMemo(() => {
        try {
            const parsed = JSON.parse((images as string) || "[]");
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    }, [images]);

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
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Фото адреса</Text>
                    {!!addressName && (
                        <Text style={styles.headerSubtitle} numberOfLines={2}>
                            {addressName as string}
                        </Text>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {imageList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Image
                            source={require("../assets/images/info.png")}
                            style={styles.emptyIcon}
                            resizeMode="contain"
                        />
                        <Text style={styles.emptyTitle}>Нет фотографий</Text>
                        <Text style={styles.emptyText}>
                            Для этого адреса ещё не добавлены изображения.
                        </Text>
                    </View>
                ) : (
                    imageList.map((url, index) => (
                        <TouchableOpacity
                            key={`${url}-${index}`}
                            style={styles.imageCard}
                            onPress={() => setSelectedImage(getImageUrl(url))}
                        >
                            <Image
                                source={{ uri: getImageUrl(url) }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <Modal
                visible={!!selectedImage}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedImage(null)}>
                    {selectedImage ? (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    ) : null}
                </Pressable>
            </Modal>
        </View>
    );
};

const screenWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F7F7",
        ...Platform.select({
            android: {
                paddingTop: 38,
            },
            ios: {},
        }),
    },
    header: {
        flexDirection: "row",
        backgroundColor: "white",
        alignItems: "center",
        padding: 24,
    },
    backButton: {
        padding: 8,
        backgroundColor: "#EFEFEF",
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    headerText: {
        marginLeft: 16,
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "500",
        color: "#292D32",
    },
    headerSubtitle: {
        fontSize: 13,
        color: "#7d7d7f",
        marginTop: 4,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        gap: 16,
    },
    imageCard: {
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "white",
    },
    image: {
        width: screenWidth - 48,
        height: (screenWidth - 48) * 0.75,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        width: 48,
        height: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "500",
        color: "#292D32",
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#7d7d7f",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    fullImage: {
        width: "100%",
        height: "80%",
    },
});

export default AddressImages;
