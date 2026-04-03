/**
 * Native OSM map component using react-native-maps with PROVIDER_DEFAULT.
 * Uses OpenStreetMap tile server — no Google API key required.
 */
import MapView, { Marker, UrlTile, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import { StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface StorePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distMeters: number | null;
}

interface OsmMapProps {
  latitude: number;
  longitude: number;
  stores: StorePin[];
  formatDistance: (meters: number) => string;
}

export function OsmMap({ latitude, longitude, stores, formatDistance }: OsmMapProps) {
  const colors = useColors();
  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={styles.map}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={true}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      liteMode={false}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
        tileSize={256}
      />
      {stores.map((store) => (
        <Marker
          key={store.id}
          coordinate={{ latitude: store.lat, longitude: store.lng }}
          title={store.name}
          description={store.distMeters !== null ? formatDistance(store.distMeters) : undefined}
          pinColor={colors.primary}
        />
      ))}
      {stores.map((store) => (
        <Circle
          key={`circle-${store.id}`}
          center={{ latitude: store.lat, longitude: store.lng }}
          radius={400}
          strokeColor={colors.primary + "60"}
          fillColor={colors.primary + "15"}
          strokeWidth={1.5}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", height: 220 },
});
