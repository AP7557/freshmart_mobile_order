import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { MenuData, Promotion } from "@/types";
import { useCartStore } from "@/store/cart";

function promoLabel(p: Promotion): string {
  if (p.type === "percent") return `${p.value}% OFF`;
  if (p.type === "fixed") return `$${(p.value / 100).toFixed(2)} OFF`;
  if (p.type === "buy_x_get_y") return `Buy ${p.triggerQty} Get ${p.rewardQty} ${p.value === 100 ? "FREE" : `${p.value}% off`}`;
  if (p.type === "bundle") return `Bundle ${p.value}% OFF`;
  return `${p.value}% OFF`;
}
const ICONS: Record<string, string> = { percent: "🏷️", fixed: "💵", item: "🛒", buy_x_get_y: "🎁", bundle: "📦" };

export default function HomeScreen() {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const { data, isLoading, refetch, isRefetching } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });
  const now = new Date();
  const activePromos = (data?.promotions ?? []).filter((p) => p.isActive && new Date(p.startAt) <= now && new Date(p.endAt) >= now);
  const autoPromos = activePromos.filter((p) => !p.promotionCode);
  const codePromos = activePromos.filter((p) => !!p.promotionCode);
  const featured = (data?.items ?? []).filter((i) => i.isActive).slice(0, 6);

  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /><Text style={s.loadTxt}>Loading deals…</Text></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.screen} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} contentContainerStyle={{ paddingBottom: cartCount > 0 ? 110 : 32 }}>
        <View style={s.hero}><Text style={s.heroEmoji}>🥪</Text><Text style={s.heroTitle}>FreshMart</Text><Text style={s.heroSub}>Fresh made, your way</Text></View>

        {autoPromos.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>✨ Auto-Applied Deals</Text>
            <Text style={s.secSub}>Added automatically at checkout</Text>
            {autoPromos.map((p) => (
              <View key={p.id} style={s.cardGreen}>
                <View style={s.pRow}><Text style={s.pIcon}>{ICONS[p.type] ?? "🏷️"}</Text><View style={{ flex: 1 }}><Text style={s.pName}>{p.name}</Text><Text style={s.pVal}>{promoLabel(p)}</Text></View><View style={s.autoBadge}><Text style={s.autoBadgeTxt}>AUTO</Text></View></View>
                {!!p.description && <Text style={s.pDesc}>{p.description}</Text>}
                {p.minOrderTotal > 0 && <Text style={s.pMin}>Min order: ${(p.minOrderTotal / 100).toFixed(2)}</Text>}
              </View>
            ))}
          </View>
        )}

        {codePromos.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>🔑 Promo Codes</Text>
            <Text style={s.secSub}>Enter at checkout to redeem</Text>
            {codePromos.map((p) => (
              <View key={p.id} style={s.cardYellow}>
                <View style={s.pRow}><Text style={s.pIcon}>{ICONS[p.type] ?? "🏷️"}</Text><View style={{ flex: 1 }}><Text style={s.pName}>{p.name}</Text><Text style={s.pVal}>{promoLabel(p)}</Text></View></View>
                {!!p.description && <Text style={s.pDesc}>{p.description}</Text>}
                <View style={s.codePill}><Text style={s.codeTxt}>{p.promotionCode}</Text></View>
              </View>
            ))}
          </View>
        )}

        {activePromos.length === 0 && <View style={s.noDeals}><Text style={s.noDealsT}>No active deals right now — check back soon!</Text></View>}

        {featured.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>🌟 Featured Items</Text>
            <View style={s.grid}>
              {featured.map((item) => (
                <TouchableOpacity key={item.id} style={s.itemCard} onPress={() => router.push(`/item/${item.id}`)} activeOpacity={0.85}>
                  {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.itemImg} resizeMode="cover" /> : <View style={[s.itemImg, s.imgPh]}><Text style={{ fontSize: 36 }}>🥪</Text></View>}
                  <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.itemPrice}>from ${(item.basePrice / 100).toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/menu")} activeOpacity={0.85}>
          <Text style={s.menuBtnTxt}>View Full Menu →</Text>
        </TouchableOpacity>
      </ScrollView>

      {cartCount > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => router.push("/cart")} activeOpacity={0.9}>
          <Text style={s.cartBarTxt}>🛒  View Cart ({cartCount} item{cartCount !== 1 ? "s" : ""})</Text>
          <Text style={s.cartBarArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loadTxt: { color: "#6b7280", fontSize: 14 },
  hero: { backgroundColor: "#111827", paddingVertical: 36, paddingHorizontal: 20, alignItems: "center" }, heroEmoji: { fontSize: 44, marginBottom: 8 }, heroTitle: { fontSize: 30, fontWeight: "800", color: "#fff" }, heroSub: { fontSize: 14, color: "#9ca3af", marginTop: 4 },
  section: { paddingHorizontal: 16, paddingTop: 22, gap: 10 }, secTitle: { fontSize: 18, fontWeight: "700", color: "#111827" }, secSub: { fontSize: 12, color: "#9ca3af", marginTop: -6 },
  cardGreen: { backgroundColor: "#ecfdf5", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#6ee7b7", gap: 6 }, cardYellow: { backgroundColor: "#fef3c7", borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "#fcd34d", gap: 6 },
  pRow: { flexDirection: "row", alignItems: "center", gap: 10 }, pIcon: { fontSize: 26 }, pName: { fontSize: 15, fontWeight: "700", color: "#111827" }, pVal: { fontSize: 13, fontWeight: "600", color: "#059669", marginTop: 2 }, pDesc: { fontSize: 12, color: "#374151" }, pMin: { fontSize: 11, color: "#9ca3af" },
  autoBadge: { backgroundColor: "#059669", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }, autoBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  codePill: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }, codeTxt: { color: "#fbbf24", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  noDeals: { padding: 28, alignItems: "center" }, noDealsT: { color: "#9ca3af", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, itemCard: { width: "47%", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, itemImg: { width: "100%", height: 110 }, imgPh: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }, itemName: { fontSize: 13, fontWeight: "600", color: "#111827", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 2 }, itemPrice: { fontSize: 12, color: "#6b7280", paddingHorizontal: 10, paddingBottom: 10 },
  menuBtn: { margin: 16, backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" }, menuBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cartBar: { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#3b82f6", borderRadius: 14, paddingVertical: 15, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 8, shadowColor: "#3b82f6", shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }, cartBarTxt: { color: "#fff", fontWeight: "700", fontSize: 15 }, cartBarArrow: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
