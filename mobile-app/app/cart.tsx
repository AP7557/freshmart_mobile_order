import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useCartStore } from "@/store/cart";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { MenuData, ModifierOption } from "@/types";

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();
  const { data } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });
  const allOptions: ModifierOption[] = data?.modifierOptions ?? [];

  if (items.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyIcon}>🛒</Text>
        <Text style={s.emptyTitle}>Your cart is empty</Text>
        <Text style={s.emptyDesc}>Add items from the menu to get started.</Text>
        <TouchableOpacity style={s.menuBtn} onPress={() => router.push("/menu")}>
          <Text style={s.menuBtnText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
        {items.map((ci) => {
          const selectedOpts = ci.selectedModifierOptionIds
            .map((oid) => allOptions.find((o) => o.id === oid))
            .filter(Boolean) as ModifierOption[];
          return (
            <View key={ci.cartId} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{ci.item.name}</Text>
                  {selectedOpts.length > 0 && (
                    <View style={s.modsList}>
                      {selectedOpts.map((o) => <Text key={o.id} style={s.modTag}>✓ {o.name}</Text>)}
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => removeItem(ci.cartId)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Text style={s.removeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={s.cardBottom}>
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ci.cartId, ci.quantity - 1)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qty}>{ci.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQuantity(ci.cartId, ci.quantity + 1)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={s.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.linePrice}>${((ci.unitPrice * ci.quantity) / 100).toFixed(2)}</Text>
              </View>
            </View>
          );
        })}
        <View style={s.totalCard}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Estimated Subtotal</Text>
            <Text style={s.totalValue}>${(subtotal() / 100).toFixed(2)}</Text>
          </View>
          <Text style={s.totalNote}>Final total (with discounts & tax) is calculated at checkout.</Text>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity style={s.checkoutBtn} onPress={() => router.push("/checkout")}>
          <Text style={s.checkoutBtnText}>Proceed to Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  emptyDesc: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  menuBtn: { marginTop: 8, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  menuBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  modsList: { marginTop: 4, gap: 3 },
  modTag: { fontSize: 12, color: "#6b7280" },
  removeIcon: { fontSize: 16, color: "#d1d5db", padding: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  qtyBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 20, fontWeight: "600", color: "#111827", lineHeight: 22 },
  qty: { fontSize: 16, fontWeight: "700", color: "#111827", minWidth: 24, textAlign: "center" },
  linePrice: { fontSize: 16, fontWeight: "700", color: "#111827" },
  totalCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  totalLabel: { fontSize: 14, color: "#374151" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#111827" },
  totalNote: { fontSize: 11, color: "#9ca3af" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", padding: 16 },
  checkoutBtn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
