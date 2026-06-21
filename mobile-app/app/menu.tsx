import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, TextInput,
} from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MenuData } from "@/types";
import { useCartStore } from "@/store/cart";

export default function MenuScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ["menu"],
    queryFn: () => apiFetch("/api/menu"),
  });

  const items = (data?.items ?? []).filter(
    (i) => i.isActive && i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <View style={s.screen}>
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search menu…" returnKeyType="search" clearButtonMode="while-editing" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: cartCount > 0 ? 100 : 24 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🥪</Text>
            <Text style={s.emptyText}>No items found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/item/${item.id}`)} activeOpacity={0.85}>
            {item.imageUrl
              ? <Image source={{ uri: item.imageUrl }} style={s.image} resizeMode="cover" />
              : <View style={[s.image, s.imagePlaceholder]}><Text style={{ fontSize: 36 }}>🥪</Text></View>
            }
            <View style={s.info}>
              <Text style={s.name}>{item.name}</Text>
              {item.description ? <Text style={s.desc} numberOfLines={2}>{item.description}</Text> : null}
              <Text style={s.price}>from ${(item.basePrice / 100).toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      {cartCount > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => router.push("/cart")} activeOpacity={0.9}>
          <Text style={s.cartBarText}>🛒  View Cart ({cartCount} item{cartCount > 1 ? "s" : ""})</Text>
          <Text style={s.cartBarArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", margin: 12, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: "#111827" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: "#9ca3af" },
  card: { backgroundColor: "#fff", borderRadius: 14, flexDirection: "row", overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  image: { width: 100, height: 100 },
  imagePlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  info: { flex: 1, padding: 12, justifyContent: "center", gap: 4 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  desc: { fontSize: 12, color: "#6b7280", lineHeight: 17 },
  price: { fontSize: 14, fontWeight: "600", color: "#3b82f6" },
  cartBar: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#3b82f6", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 6, shadowColor: "#3b82f6", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cartBarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cartBarArrow: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
