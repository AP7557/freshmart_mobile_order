import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Item, Modifier, ModifierOption, Promotion } from "@/types";

interface MenuData { items: Item[]; modifiers: Modifier[]; modifierOptions: ModifierOption[]; promotions: Promotion[] }

export default function PromotionsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery<MenuData>({
    queryKey: ["menu"],
    queryFn: () => apiFetch("/api/menu"),
  });

  const activePromos = data?.promotions.filter((p) => p.isActive) ?? [];
  const featuredItems = data?.items.slice(0, 6) ?? [];

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {activePromos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 Today's Deals</Text>
          {activePromos.map((promo) => (
            <View key={promo.id} style={styles.promoCard}>
              <Text style={styles.promoName}>{promo.name}</Text>
              <Text style={styles.promoDesc}>{promo.description}</Text>
              {promo.promotionCode && (
                <Text style={styles.promoCode}>Code: {promo.promotionCode}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Items</Text>
        <View style={styles.itemGrid}>
          {featuredItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => router.push(`/item/${item.id}`)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]} />
              )}
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>${(item.basePrice / 100).toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.menuBtn} onPress={() => router.push("/menu")}>
        <Text style={styles.menuBtnText}>View Full Menu →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  promoCard: { backgroundColor: "#eff6ff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#bfdbfe" },
  promoName: { fontSize: 16, fontWeight: "600", color: "#1d4ed8" },
  promoDesc: { fontSize: 13, color: "#374151", marginTop: 2 },
  promoCode: { fontSize: 12, color: "#6b7280", marginTop: 4, fontStyle: "italic" },
  itemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  itemCard: { width: "47%", backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  itemImage: { width: "100%", height: 120, backgroundColor: "#e5e7eb" },
  itemImagePlaceholder: { backgroundColor: "#e5e7eb" },
  itemName: { fontSize: 14, fontWeight: "600", color: "#111827", padding: 8, paddingBottom: 2 },
  itemPrice: { fontSize: 13, color: "#6b7280", paddingHorizontal: 8, paddingBottom: 8 },
  menuBtn: { margin: 16, backgroundColor: "#111827", borderRadius: 12, padding: 16, alignItems: "center" },
  menuBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
