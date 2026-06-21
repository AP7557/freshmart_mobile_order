import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Item, Modifier, ModifierOption, Promotion } from "@/types";
import { useCartStore } from "@/store/cart";

interface MenuData { items: Item[]; modifiers: Modifier[]; modifierOptions: ModifierOption[]; promotions: Promotion[] }

export default function MenuScreen() {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const { data, isLoading } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.screen}>
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => router.push("/cart")}>
          <Text style={styles.cartBarText}>View Cart ({cartCount} items) →</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/item/${item.id}`)}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]} />
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.price}>${(item.basePrice / 100).toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, gap: 12 },
  cartBar: { backgroundColor: "#111827", padding: 14, alignItems: "center" },
  cartBarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 12, flexDirection: "row", overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  image: { width: 100, height: 100 },
  imagePlaceholder: { backgroundColor: "#e5e7eb" },
  info: { flex: 1, padding: 12, gap: 4 },
  name: { fontSize: 16, fontWeight: "600", color: "#111827" },
  desc: { fontSize: 13, color: "#6b7280" },
  price: { fontSize: 15, fontWeight: "700", color: "#111827", marginTop: 4 },
});
