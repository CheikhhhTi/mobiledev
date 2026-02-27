import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";

export default function SettingsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#000" : "#fff",
    },

    switch: {
      marginTop: 20,
      borderColor: "#424242",
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      color: isDarkMode ? "#fff" : "#000",
    },
  });

  return (
    <View style={styles.container}>
      <Text style={{ color: isDarkMode ? "#fff" : "#000" }}>Settings Screen</Text>
      <View style={styles.switch}>
        <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
          <Text style={{ color: isDarkMode ? "#fff" : "#000" }}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}