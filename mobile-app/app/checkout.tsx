import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useCartStore } from "@/store/cart";
import { apiFetch } from "@/lib/api";
import { OrderConfirmation } from "@/types";
import { useState } from "react";
function isValidPhone(p: string) { return /^\+?[1-9]\d{7,14}$/.test(p.replace(/\s/g, "")); }
export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, clearCart } = useCartStore();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [promo, setPromo] = useState("");
  const [loading, setLoading] = useState(false); const [errors, setErrors] = useState<Record<string, string>>({});
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!isValidPhone(phone)) e.phone = "Enter a valid phone (e.g. +12125551234)";
    setErrors(e); return Object.keys(e).length === 0;
  }
  async function handlePay() {
    if (!validate()) return; setLoading(true);
    try {
      const result = await apiFetch<OrderConfirmation>("/api/orders", { method: "POST", body: JSON.stringify({ customerName: name.trim(), customerPhone: phone.trim(), lines: items.map((ci) => ({ itemId: ci.item.id, quantity: ci.quantity, modifierOptionIds: ci.selectedModifierOptionIds })), promoCode: promo.trim() || undefined }) });
      const { error: initErr } = await initPaymentSheet({ merchantDisplayName: "FreshMart", paymentIntentClientSecret: result.clientSecret, defaultBillingDetails: { name: name.trim(), phone: phone.trim() }, allowsDelayedPaymentMethods: false });
      if (initErr) { Alert.alert("Payment Setup Error", initErr.message); return; }
      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) { if (presentErr.code !== "Canceled") Alert.alert("Payment Failed", presentErr.message); return; }
      clearCart(); router.replace(`/order-confirmation/${result.orderId}`);
    } catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong."); } finally { setLoading(false); }
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionHead}>Your Details</Text>
      <View style={s.field}><Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text><TextInput style={[s.input, errors.name ? s.inputErr : null]} value={name} onChangeText={setName} placeholder="Jane Smith" autoCapitalize="words" autoCorrect={false} returnKeyType="next" />{!!errors.name && <Text style={s.errMsg}>{errors.name}</Text>}</View>
      <View style={s.field}><Text style={s.label}>Phone Number <Text style={s.req}>*</Text></Text><TextInput style={[s.input, errors.phone ? s.inputErr : null]} value={phone} onChangeText={setPhone} placeholder="+12125551234" keyboardType="phone-pad" autoCorrect={false} returnKeyType="done" />{!!errors.phone && <Text style={s.errMsg}>{errors.phone}</Text>}<Text style={s.hint}>We'll text your order status to this number.</Text></View>
      <View style={s.field}><Text style={s.label}>Promo Code <Text style={s.opt}>(optional)</Text></Text><TextInput style={s.input} value={promo} onChangeText={setPromo} placeholder="SAVE10" autoCapitalize="characters" autoCorrect={false} /></View>
      <View style={s.summaryCard}>
        <Text style={s.sectionHead}>Order Summary</Text>
        {items.map((ci) => (<View key={ci.cartId} style={s.sumRow}><Text style={s.sumQty}>{ci.quantity}×</Text><Text style={s.sumName}>{ci.item.name}</Text><Text style={s.sumPrice}>${((ci.unitPrice * ci.quantity) / 100).toFixed(2)}</Text></View>))}
        <View style={s.divider} />
        <View style={s.sumRow}><Text style={[s.sumName, { fontWeight: "700" }]}>Est. Subtotal</Text><Text style={[s.sumPrice, { fontWeight: "800", fontSize: 15 }]}>${(subtotal() / 100).toFixed(2)}</Text></View>
        <Text style={s.sumNote}>Final total calculated at payment.</Text>
      </View>
      <View style={s.notice}><Text style={s.noticeText}>💳  Payment processed securely via Stripe.</Text></View>
      <View style={s.notice}><Text style={s.noticeText}>⏱  Wait time shown after placing order.</Text></View>
      <TouchableOpacity style={[s.payBtn, loading && s.payBtnLoading]} onPress={handlePay} disabled={loading} activeOpacity={0.85}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.payBtnText}>Pay Now →</Text>}</TouchableOpacity>
    </ScrollView>
  );
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#f9fafb" }, scroll: { padding: 16, gap: 14, paddingBottom: 40 }, sectionHead: { fontSize: 17, fontWeight: "700", color: "#111827" }, field: { gap: 4 }, label: { fontSize: 13, fontWeight: "600", color: "#374151" }, req: { color: "#ef4444" }, opt: { color: "#9ca3af", fontWeight: "400" }, input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827" }, inputErr: { borderColor: "#ef4444" }, errMsg: { fontSize: 12, color: "#ef4444" }, hint: { fontSize: 11, color: "#9ca3af" }, summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 8 }, sumRow: { flexDirection: "row", alignItems: "center" }, sumQty: { fontSize: 13, color: "#9ca3af", width: 28 }, sumName: { flex: 1, fontSize: 13, color: "#374151" }, sumPrice: { fontSize: 13, color: "#111827" }, divider: { height: 1, backgroundColor: "#f3f4f6" }, sumNote: { fontSize: 11, color: "#9ca3af" }, notice: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12 }, noticeText: { fontSize: 12, color: "#6b7280", lineHeight: 18 }, payBtn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" }, payBtnLoading: { backgroundColor: "#374151" }, payBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 } });
