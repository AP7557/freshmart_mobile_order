import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MenuData } from "@/types";
import { useCartStore } from "@/store/cart";
import { useState, useMemo } from "react";

export default function MenuScreen() {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const { data, isLoading } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });
  const [search, setSearch] = useState("");
  const items = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.items ?? []).filter((i) => i.isActive && (i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)));
  }, [data, search]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchBar}><Text style={s.searchIcon}>🔍</Text><TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="Search menu…" returnKeyType="search" /></View>
      {isLoading
        ? <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
        : items.length === 0
          ? <View style={s.center}><Text style={{ fontSize: 40 }}>😕</Text><Text style={s.emptyTxt}>No items found</Text></View>
          : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: cartCount > 0 ? 110 : 32 }}>
              {items.map((item) => (
                <TouchableOpacity key={item.id} style={s.card} onPress={() => router.push(`/item/${item.id}`)} activeOpacity={0.85}>
                  {item.imageUrl
                    ? <Image source={{ uri: item.imageUrl }} style={s.cardImg} resizeMode="cover" />
                    : <View style={[s.cardImg, s.imgPh]}><Text style={{ fontSize: 40 }}>🥪</Text></View>
                  }
                  <View style={s.cardInfo}>
                    <Text style={s.cardName}>{item.name}</Text>
                    {!!item.description && <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>}
                    <View style={s.cardBottom}><Text style={s.cardPrice}>from ${(item.basePrice / 100).toFixed(2)}</Text><View style={s.addPill}><Text style={s.addPillTxt}>Customize →</Text></View></View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
      }
      {cartCount > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => router.push("/cart")} activeOpacity={0.9}>
          <Text style={s.cartBarTxt}>🛒  Cart ({cartCount})</Text><Text style={s.cartBarArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5e7eb" }, searchIcon: { fontSize: 16, marginRight: 8 }, searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#111827" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, emptyTxt: { fontSize: 14, color: "#9ca3af" },
  card: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardImg: { width: 110, height: 110 }, imgPh: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, padding: 12, justifyContent: "space-between" }, cardName: { fontSize: 16, fontWeight: "700", color: "#111827" }, cardDesc: { fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 18 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }, cardPrice: { fontSize: 14, fontWeight: "600", color: "#111827" }, addPill: { backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }, addPillTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cartBar: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#3b82f6", borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 8, shadowColor: "#3b82f6", shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, cartBarTxt: { color: "#fff", fontWeight: "700", fontSize: 15 }, cartBarArrow: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
