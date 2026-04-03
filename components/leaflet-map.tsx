import React from "react";
import { View, Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface StorePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  stores?: StorePin[];
  style?: object;
}

/**
 * Pure OpenStreetMap map using Leaflet via WebView.
 * Zero Google dependencies — no API key, no GMS, no crashes.
 */
export function LeafletMap({ latitude, longitude, stores = [], style }: LeafletMapProps) {
  const storesJson = JSON.stringify(
    stores.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }))
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${latitude}, ${longitude}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // User location marker (blue dot)
    var userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#2563EB;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    L.marker([${latitude}, ${longitude}], { icon: userIcon }).addTo(map);

    // Store markers (red pins with 400m circle)
    var stores = ${storesJson};
    stores.forEach(function(s) {
      var storeIcon = L.divIcon({
        html: '<div style="width:12px;height:12px;background:#EF4444;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      L.marker([s.lat, s.lng], { icon: storeIcon }).bindPopup(s.name).addTo(map);
      L.circle([s.lat, s.lng], { radius: 400, color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.08, weight: 1.5 }).addTo(map);
    });
  </script>
</body>
</html>`;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={html}
          style={{ width: "100%", height: "100%", border: "none" }}
          sandbox="allow-scripts"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
