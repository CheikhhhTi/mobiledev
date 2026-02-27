import { useState, useEffect } from 'react';
import {
  Platform, Text, View, StyleSheet, Dimensions,
  TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, MapStyleElement } from 'react-native-maps';
import { fetchWeatherApi } from "openmeteo";

// ── Theme colours ──────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg:               '#f2f2f7',
    card:             'rgba(255,255,255,0.95)',
    dayRow:           'rgba(0,0,0,0.04)',
    inputBorder:      '#ccc',
    inputBg:          '#fff',
    inputText:        '#000',
    inputPlaceholder: '#999',
    text:             '#000',
    subText:          '#333',
    closeText:        '#666',
    divider:          '#e0e0e0',
    toggleBg:         '#e0e0e0',
    toggleThumb:      '#fff',
    toggleIcon:       '☀️',
    mapStyle:         [] as MapStyleElement[],
  },
  dark: {
    bg:               '#1c1c1e',
    card:             'rgba(44,44,46,0.97)',
    dayRow:           'rgba(255,255,255,0.06)',
    inputBorder:      '#444',
    inputBg:          '#2c2c2e',
    inputText:        '#fff',
    inputPlaceholder: '#888',
    text:             '#fff',
    subText:          '#ccc',
    closeText:        '#aaa',
    divider:          '#3a3a3c',
    toggleBg:         '#555',
    toggleThumb:      '#fff',
    toggleIcon:       '🌙',
    mapStyle: [
      { elementType: 'geometry',           stylers: [{ color: '#212121' }] },
      { elementType: 'labels.text.fill',   stylers: [{ color: '#757575' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
      { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#373737' }] },
      { featureType: 'road.highway',       elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
      { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#000000' }] },
      { featureType: 'poi',                elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
    ] as MapStyleElement[],
  },
} as const;

// WMO weather code → emoji + label
function weatherIcon(code: number): string {
  if (code === 0)           return '☀️';
  if (code <= 2)            return '⛅';
  if (code <= 3)            return '☁️';
  if (code <= 49)           return '🌫️';
  if (code <= 59)           return '🌦️';
  if (code <= 69)           return '🌧️';
  if (code <= 79)           return '🌨️';
  if (code <= 84)           return '🌦️';
  if (code <= 99)           return '⛈️';
  return '🌡️';
}

type DayForecast = {
  date: string;       // e.g. "Mon 27"
  icon: string;
  tempMax: number;
  tempMin: number;
  windMax: number;
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function Gps() {
  const [isDark, setIsDark]           = useState(false);
  const [location, setLocation]       = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [route, setRoute]             = useState<{ latitude: number; longitude: number }[]>([]);
  const [search, setSearch]           = useState('');
  const [showWeather, setShowWeather] = useState(false);
  const [forecast, setForecast]       = useState<DayForecast[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const theme = THEMES[isDark ? 'dark' : 'light'];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const goToPlace = async () => {
    if (!search.trim()) return;
    try {
      const results = await Location.geocodeAsync(search);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setLocation({
          coords: {
            latitude, longitude,
            altitude: 0, accuracy: 0, heading: 0, speed: 0, altitudeAccuracy: 0,
          },
          timestamp: Date.now(),
        } as Location.LocationObject);
        setRoute([]);
        setShowWeather(false);
      }
    } catch (e) {
      console.warn('Geocode failed', e);
    }
  };

  const handleWeatherPress = async () => {
    if (!location) return;
    const { latitude, longitude } = location.coords;
    setLoadingWeather(true);
    try {
      const responses = await fetchWeatherApi(
        "https://api.open-meteo.com/v1/forecast",
        {
          latitude,
          longitude,
          timezone: 'auto',
          daily: [
            "weathercode",
            "temperature_2m_max",
            "temperature_2m_min",
            "windspeed_10m_max",
          ],
          forecast_days: 7,
        }
      );

      const daily = responses[0].daily();
      if (!daily) {
        console.warn('No daily weather data in response');
        setForecast([]);
      } else {
        // daily().time() returns BigInt seconds for the first day;
        // timeEnd() is the last day + 1 interval.
        // We iterate by index over the 7 values.
        const days: DayForecast[] = [];
        const startMs = Number(daily.time()) * 1000;
        const intervalMs = Number(daily.interval()) * 1000;

        const codes     = daily.variables(0)!;
        const tempMax   = daily.variables(1)!;
        const tempMin   = daily.variables(2)!;
        const windMax   = daily.variables(3)!;

        for (let i = 0; i < 7; i++) {
          const date = new Date(startMs + i * intervalMs);
          days.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            icon: weatherIcon(codes.valuesArray()![i]),
            tempMax: tempMax.valuesArray()![i],
            tempMin: tempMin.valuesArray()![i],
            windMax: windMax.valuesArray()![i],
          });
        }
        setForecast(days);
      }
      setShowWeather(true);
    } catch (e) {
      console.warn('Weather fetch failed', e);
    } finally {
      setLoadingWeather(false);
    }
  };

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function getCurrentLocation() {
      if (Platform.OS === 'android' && !Device.isDevice) {
        setErrorMsg('This will not work on an emulator. Use a real device.');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setErrorMsg('Location permission denied.'); return; }
      setLocation(await Location.getCurrentPositionAsync({}));
    }
    getCurrentLocation();
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    async function startWatching() {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          setLocation(loc);
          setRoute((prev) => [
            ...prev,
            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
          ]);
        }
      );
    }
    startWatching();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  // ── Early returns ────────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.text }}>Loading map…</Text>
      </View>
    );
  }

  const { latitude, longitude } = location.coords;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
        <TextInput
          style={[styles.searchInput, {
            borderColor: theme.inputBorder,
            backgroundColor: theme.inputBg,
            color: theme.inputText,
          }]}
          placeholder="Search for a location"
          placeholderTextColor={theme.inputPlaceholder}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={goToPlace}
          returnKeyType="search"
        />
      </View>

      {/* Dark / Light toggle */}
      <TouchableOpacity
        style={[styles.toggleButton, { backgroundColor: theme.toggleBg }]}
        onPress={() => setIsDark((d) => !d)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.toggleThumb,
          { backgroundColor: theme.toggleThumb, marginLeft: isDark ? 'auto' : 0 },
        ]} />
        <Text style={[styles.toggleIcon, { marginLeft: isDark ? 4 : 'auto' }]}>
          {theme.toggleIcon}
        </Text>
      </TouchableOpacity>

      {/* Map */}
      <MapView
        style={styles.map}
        customMapStyle={theme.mapStyle}
        region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        <Marker coordinate={{ latitude, longitude }} title="You are here" />
        <Polyline coordinates={route} strokeWidth={4} strokeColor="#007aff" />
      </MapView>

      {/* Weather FAB */}
      <TouchableOpacity
        style={styles.weatherButton}
        onPress={handleWeatherPress}
        disabled={loadingWeather}
      >
        <Text style={styles.weatherButtonText}>{loadingWeather ? '…' : '☁️'}</Text>
      </TouchableOpacity>

      {/* 7-day forecast card */}
      {showWeather && forecast.length > 0 && (
        <View style={[styles.weatherCard, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.weatherTitle, { color: theme.text }]}>7-Day Forecast</Text>
            <TouchableOpacity onPress={() => setShowWeather(false)} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.closeText }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Column labels */}
          <View style={[styles.dayRow, styles.labelRow]}>
            <Text style={[styles.labelText, { color: theme.subText, flex: 2 }]}>Day</Text>
            <Text style={[styles.labelText, { color: theme.subText, flex: 1, textAlign: 'center' }]}>High</Text>
            <Text style={[styles.labelText, { color: theme.subText, flex: 1, textAlign: 'center' }]}>Low</Text>
            <Text style={[styles.labelText, { color: theme.subText, flex: 1, textAlign: 'right' }]}>Wind</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          {/* Rows */}
          <ScrollView style={styles.forecastScroll} showsVerticalScrollIndicator={false}>
            {forecast.map((day, i) => (
              <View key={i}>
                <View style={[styles.dayRow, i % 2 === 1 && { backgroundColor: theme.dayRow }]}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.dayIcon}>{day.icon}</Text>
                    <Text style={[styles.dayDate, { color: theme.text }]}>{day.date}</Text>
                  </View>
                  <Text style={[styles.dayTemp, { color: '#e05d00', flex: 1, textAlign: 'center' }]}>
                    {day.tempMax.toFixed(0)}°
                  </Text>
                  <Text style={[styles.dayTemp, { color: '#007aff', flex: 1, textAlign: 'center' }]}>
                    {day.tempMin.toFixed(0)}°
                  </Text>
                  <Text style={[styles.dayWind, { color: theme.subText, flex: 1, textAlign: 'right' }]}>
                    {day.windMax.toFixed(0)} km/h
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  map: {
    width: Dimensions.get('window').width,
    height: 400,
    marginTop: 20,
  },

  searchBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 90,
    zIndex: 10,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 16,
  },

  toggleButton: {
    position: 'absolute',
    top: 28,
    right: 20,
    zIndex: 10,
    width: 60,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },

  toggleIcon: {
    fontSize: 13,
  },

  weatherButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  weatherButtonText: {
    fontSize: 22,
  },

  weatherCard: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    maxHeight: 340,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  weatherTitle: {
    fontSize: 17,
    fontWeight: '700',
  },

  closeButton: {
    padding: 4,
  },

  closeText: {
    fontSize: 16,
  },

  labelRow: {
    marginBottom: 4,
  },

  labelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    marginBottom: 4,
  },

  forecastScroll: {
    flexGrow: 0,
  },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 6,
  },

  dayIcon: {
    fontSize: 20,
  },

  dayDate: {
    fontSize: 14,
    fontWeight: '500',
  },

  dayTemp: {
    fontSize: 14,
    fontWeight: '600',
  },

  dayWind: {
    fontSize: 13,
  },
});