import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useCartStore } from "@/store/cart";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ModifierOption } from "@/types";

interface MenuData { modifierOptions: ModifierOption[] }

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();
  const { data } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });
  const allOptions = data?.modifierOptions ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.push("/menu")}>
          <Text style={styles.btnText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.map((ci) => (
          <View key={ci.cartId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemName}>{ci.item.name}</Text>
              <TouchableOpacity onPress={() => removeItem(ci.cartId)}>
                <Text style={styles.remove}>✕</Text>
              </TouchableOpacity>
            </View>
            {ci.selectedModifierOptionIds.map((optId) => {
              const opt = allOptions.find((o) => o.id === optId);
              return opt ? <Text key={optId} style={styles.modifier}>+ {opt.name}</Text> : null;
            })}
            <View style={styles.cardFooter}>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(ci.cartId, ci.quantity - 1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{ci.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(ci.cartId, ci.quantity + 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.lineTotal}>${((ci.unitPrice * ci.quantity) / 100).toFixed(2)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Subtotal</Text>
            <Text style={styles.summaryValue}>${(subtotal() / 100).toFixed(2)}</Text>
          </View>
          <Text style={styles.summaryNote}>Final total (with discounts & tax) will be calculated at checkout.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push("/checkout")}>
          <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 18, color: "#6b7280" },
  btn: { backgroundColor: "#111827", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  btnText: { color: "#fff", fontWeight: "700" },
  scroll: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 6, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 15, fontWeight: "600", color: "#111827", flex: 1 },
  remove: { fontSize: 18, color: "#9ca3af", padding: 4 },
  modifier: { fontSize: 12, color: "#6b7280", marginLeft: 4 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 18, fontWeight: "600", color: "#111827" },
  qty: { fontSize: 16, fontWeight: "700", color: "#111827" },
  lineTotal: { fontSize: 15, fontWeight: "700", color: "#111827" },
  summaryCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, color: "#374151" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  summaryNote: { fontSize: 11, color: "#9ca3af", marginTop: 4 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", padding: 16 },
  checkoutBtn: { backgroundColor: "#111827", borderRadius: 12, padding: 16, alignItems: "center" },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
