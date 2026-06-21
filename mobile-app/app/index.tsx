import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MenuData, Promotion } from "@/types";
import { useCartStore } from "@/store/cart";

function promoValueLabel(p: Promotion): string {
  if (p.type === "percent")     return `${p.value}% OFF`;
  if (p.type === "fixed")       return `$${(p.value / 100).toFixed(2)} OFF`;
  if (p.type === "buy_x_get_y") return `Buy ${p.triggerQty} Get ${p.rewardQty} ${p.value === 100 ? "FREE" : `${p.value}% off`}`;
  if (p.type === "bundle")      return `Bundle: ${p.value}% OFF`;
  return `${p.value}% OFF`;
}

function promoIcon(type: string): string {
  const m: Record<string, string> = { percent: "🏷️", fixed: "💵", item: "🛒", buy_x_get_y: "🎁", bundle: "📦" };
  return m[type] ?? "🏷️";
}

export default function PromotionsScreen() {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));

  const { data, isLoading, refetch, isRefetching } = useQuery<MenuData>({
    queryKey: ["menu"],
    queryFn: () => apiFetch("/api/menu"),
  });

  const now = new Date();
  const activePromos = (data?.promotions ?? []).filter(
    (p) => p.isActive && new Date(p.startAt) <= now && new Date(p.endAt) >= now
  );
  const autoPromos = activePromos.filter((p) => !p.promotionCode);
  const codePromos = activePromos.filter((p) => !!p.promotionCode);
  const featuredItems = (data?.items ?? []).filter((i) => i.isActive).slice(0, 6);

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /><Text style={s.loadingText}>Loading today's deals…</Text></View>;
  }

  return (
    <ScrollView style={s.screen} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 24 }}>
      <View style={s.heroBanner}>
        <Text style={s.heroEmoji}>🥪</Text>
        <Text style={s.heroTitle}>FreshMart</Text>
        <Text style={s.heroSub}>Fresh made, your way</Text>
      </View>

      {autoPromos.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>✨ Auto-Applied Deals</Text>
          <Text style={s.sectionSub}>These discounts are added automatically</Text>
          {autoPromos.map((p) => (
            <View key={p.id} style={s.promoCardAuto}>
              <View style={s.promoHeader}>
                <Text style={s.promoIcon}>{promoIcon(p.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.promoName}>{p.name}</Text>
                  <Text style={s.promoValue}>{promoValueLabel(p)}</Text>
                </View>
                <View style={s.autoBadge}><Text style={s.autoBadgeText}>AUTO</Text></View>
              </View>
              {p.description ? <Text style={s.promoDesc}>{p.description}</Text> : null}
              {p.minOrderTotal > 0 && <Text style={s.promoMin}>Min order: ${(p.minOrderTotal / 100).toFixed(2)}</Text>}
            </View>
          ))}
        </View>
      )}

      {codePromos.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔑 Promo Codes</Text>
          <Text style={s.sectionSub}>Enter at checkout to apply</Text>
          {codePromos.map((p) => (
            <View key={p.id} style={s.promoCardCode}>
              <View style={s.promoHeader}>
                <Text style={s.promoIcon}>{promoIcon(p.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.promoName}>{p.name}</Text>
                  <Text style={s.promoValue}>{promoValueLabel(p)}</Text>
                </View>
              </View>
              {p.description ? <Text style={s.promoDesc}>{p.description}</Text> : null}
              <View style={s.codeChip}><Text style={s.codeText}>{p.promotionCode}</Text></View>
            </View>
          ))}
        </View>
      )}

      {activePromos.length === 0 && (
        <View style={s.noDeals}><Text style={s.noDealsText}>No active deals today — check back soon!</Text></View>
      )}

      {featuredItems.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🌟 Featured Items</Text>
          <View style={s.grid}>
            {featuredItems.map((item) => (
              <TouchableOpacity key={item.id} style={s.itemCard} onPress={() => router.push(`/item/${item.id}`)} activeOpacity={0.85}>
                {item.imageUrl
                  ? <Image source={{ uri: item.imageUrl }} style={s.itemImg} resizeMode="cover" />
                  : <View style={[s.itemImg, s.imgPlaceholder]}><Text style={{ fontSize: 32 }}>🥪</Text></View>
                }
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemPrice}>from ${(item.basePrice / 100).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/menu")} activeOpacity={0.85}>
        <Text style={s.menuBtnText}>View Full Menu →</Text>
      </TouchableOpacity>

      {cartCount > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => router.push("/cart")} activeOpacity={0.9}>
          <Text style={s.cartBarText}>🛒  View Cart  ({cartCount} item{cartCount > 1 ? "s" : ""})</Text>
          <Text style={s.cartBarArrow}>→</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6b7280", fontSize: 14 },
  heroBanner: { backgroundColor: "#111827", paddingVertical: 32, paddingHorizontal: 20, alignItems: "center" },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionSub: { fontSize: 12, color: "#9ca3af", marginTop: -6 },
  promoCardAuto: { backgroundColor: "#ecfdf5", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#6ee7b7" },
  promoCardCode: { backgroundColor: "#fef3c7", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#fcd34d" },
  promoHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  promoIcon: { fontSize: 24 },
  promoName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  promoValue: { fontSize: 13, fontWeight: "600", color: "#059669", marginTop: 1 },
  promoDesc: { fontSize: 12, color: "#374151", marginTop: 6 },
  promoMin: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  autoBadge: { backgroundColor: "#059669", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  autoBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  codeChip: { marginTop: 8, alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  codeText: { color: "#fbbf24", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  noDeals: { padding: 20, alignItems: "center" },
  noDealsText: { color: "#9ca3af", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  itemCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  itemImg: { width: "100%", height: 110 },
  imgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 13, fontWeight: "600", color: "#111827", padding: 8, paddingBottom: 2 },
  itemPrice: { fontSize: 12, color: "#6b7280", paddingHorizontal: 8, paddingBottom: 8 },
  menuBtn: { margin: 16, backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" },
  menuBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cartBar: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#3b82f6", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 6, shadowColor: "#3b82f6", shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cartBarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cartBarArrow: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
