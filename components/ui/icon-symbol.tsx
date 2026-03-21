import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "list.bullet": "format-list-bulleted",
  "storefront.fill": "store",
  "tag.fill": "local-offer",
  "gearshape.fill": "settings",
  "location.fill": "location-on",
  "map.fill": "map",
  "plus.circle.fill": "add-circle",
  "trash.fill": "delete",
  "checkmark": "check",
  "xmark.circle.fill": "cancel",
  "magnifyingglass": "search",
  "crown.fill": "workspace-premium",
  "globe": "language",
  "star.fill": "star",
  "bell.fill": "notifications",
  "camera.fill": "camera-alt",
  "photo.fill": "photo",
  "barcode.viewfinder": "qr-code-scanner",
  "doc.text.fill": "description",
  "arrow.up.circle.fill": "upload",
  "info.circle.fill": "info",
  "person.fill": "person",
  "gift.fill": "card-giftcard",
  "link": "link",
  "checkmark.circle.fill": "check-circle",
  "xmark": "close",
  "square.and.arrow.up": "share",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
