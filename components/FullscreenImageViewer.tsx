import ImageViewing from "react-native-image-viewing";

interface FullscreenImageViewerProps {
    images: { uri: string }[];
    imageIndex: number;
    visible: boolean;
    onRequestClose: () => void;
}

export default function FullscreenImageViewer({
    images,
    imageIndex,
    visible,
    onRequestClose,
}: FullscreenImageViewerProps) {
    return (
        <ImageViewing
            images={images}
            imageIndex={imageIndex}
            visible={visible}
            onRequestClose={onRequestClose}
            doubleTapToZoomEnabled
            swipeToCloseEnabled
        />
    );
}
