import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#27a3d4',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 20,
    minWidth: 300,
  },
  city: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  temp: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  icon: {
    fontSize: 38,
    marginRight: 10,
  },
  description: {
    fontSize: 18,
    color: '#fff',
  },
  highLowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  high: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  low: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default function WeatherScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={styles.card}>
        <Text style={styles.city}>OHIO</Text>
        <Text style={styles.temp}>67°</Text>
        <View style={styles.conditionRow}>
          <Text style={styles.icon}>☀️</Text>
          <Text style={styles.description}>Sunny</Text>
        </View>
        <View style={styles.highLowRow}>
          <Text style={styles.high}>H: 18°</Text>
          <Text style={styles.low}>L: 25°</Text>
        </View>
      </View>
    </View>
  );
}