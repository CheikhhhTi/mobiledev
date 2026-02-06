import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { useState, useEffect } from "react";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  scrollContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageWrapper: {
    width: "48%",
    marginBottom: 10,
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 200,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  largeImage: {
    width: "90%",
    height: "90%",
    resizeMode: "contain",
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 20,
    padding: 10,
  },
});

export default function GalleryScreen() {
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Generate random image URLs from Picsum
    const randomImages = Array.from({ length: 12 }, (_, i) => 
      `https://picsum.photos/200/200?random=${Math.random()}`
    );
    setImages(randomImages);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gallery</Text>
      <ScrollView>
        <View style={styles.scrollContainer}>
          {images.map((image, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageWrapper}
              onPress={() => setSelectedImage(image)}
            >
              <Image
                source={{ uri: image }}
                style={styles.image}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.largeImage}
            />
          )}
          <TouchableOpacity onPress={() => setSelectedImage(null)}>
            <Text style={styles.closeText}>Tap to Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}