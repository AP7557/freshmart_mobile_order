import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { useCartStore } from "@/store/cart";
import { apiFetch } from "@/lib/api";
import { OrderConfirmation } from "@/types";

function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/\s/g, ""));
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, clearCart } = useCartStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!isValidPhone(phone)) e.phone = "Enter a valid phone number (e.g. +12125551234)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCheckout() {
    if (!validate()) return;
    setLoading(true);
    try {
      const lines = items.map((ci) => ({
        itemId: ci.item.id,
        quantity: ci.quantity,
        modifierOptionIds: ci.selectedModifierOptionIds,
      }));
      const result = await apiFetch<OrderConfirmation>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          lines,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "FreshMart",
        paymentIntentClientSecret: result.clientSecret,
        defaultBillingDetails: { name: name.trim(), phone: phone.trim() },
        allowsDelayedPaymentMethods: false,
      });
      if (initError) { Alert.alert("Payment Setup Error", initError.message); return; }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") Alert.alert("Payment Failed", presentError.message);
        return;
      }
      clearCart();
      router.replace(`/order-confirmation/${result.orderId}`);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionTitle}>Your Details</Text>

      <View style={s.field}>
        <Text style={s.label}>Full Name <Text style={s.required}>*</Text></Text>
        <TextInput
          style={[s.input, errors.name ? s.inputError : null]}
          value={name} onChangeText={setName}
          placeholder="Jane Smith" autoCapitalize="words" autoCorrect={false} returnKeyType="next"
        />
        {errors.name ? <Text style={s.errorMsg}>{errors.name}</Text> : null}
      </View>

      <View style={s.field}>
        <Text style={s.label}>Phone Number <Text style={s.required}>*</Text></Text>
        <TextInput
          style={[s.input, errors.phone ? s.inputError : null]}
          value={phone} onChangeText={setPhone}
          placeholder="+12125551234" keyboardType="phone-pad" autoCorrect={false} returnKeyType="done"
        />
        {errors.phone ? <Text style={s.errorMsg}>{errors.phone}</Text> : null}
        <Text style={s.inputHint}>We'll text your order status to this number.</Text>
      </View>

      <View style={s.field}>
        <Text style={s.label}>Promo Code <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={s.input} value={promoCode} onChangeText={setPromoCode}
          placeholder="SAVE10" autoCapitalize="characters" autoCorrect={false} returnKeyType="done"
        />
      </View>

      <View style={s.summaryCard}>
        <Text style={s.sectionTitle}>Order Summary</Text>
        {items.map((ci) => (
          <View key={ci.cartId} style={s.summaryRow}>
            <Text style={s.summaryQty}>{ci.quantity}×</Text>
            <Text style={s.summaryItem}>{ci.item.name}</Text>
            <Text style={s.summaryPrice}>${((ci.unitPrice * ci.quantity) / 100).toFixed(2)}</Text>
          </View>
        ))}
        <View style={s.divider} />
        <View style={s.summaryRow}>
          <Text style={[s.summaryItem, { fontWeight: "700" }]}>Est. Subtotal</Text>
          <Text style={[s.summaryPrice, { fontWeight: "800" }]}>${(subtotal() / 100).toFixed(2)}</Text>
        </View>
        <Text style={s.summaryNote}>Final total (with discounts & tax) calculated at payment.</Text>
      </View>

      <View style={s.notice}><Text style={s.noticeText}>💳  Payment is processed securely via Stripe.</Text></View>
      <View style={s.notice}><Text style={s.noticeText}>⏱  Estimated wait time shown after placing order.</Text></View>

      <TouchableOpacity style={[s.btn, loading ? s.btnLoading : null]} onPress={handleCheckout} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Pay Now →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  required: { color: "#ef4444" },
  optional: { color: "#9ca3af", fontWeight: "400" },
  input: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827" },
  inputError: { borderColor: "#ef4444" },
  errorMsg: { fontSize: 12, color: "#ef4444" },
  inputHint: { fontSize: 11, color: "#9ca3af" },
  summaryCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 8 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryQty: { fontSize: 13, color: "#9ca3af", width: 28 },
  summaryItem: { flex: 1, fontSize: 13, color: "#374151" },
  summaryPrice: { fontSize: 13, color: "#111827" },
  divider: { height: 1, backgroundColor: "#f3f4f6" },
  summaryNote: { fontSize: 11, color: "#9ca3af" },
  notice: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 12 },
  noticeText: { fontSize: 12, color: "#6b7280", lineHeight: 18 },
  btn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  btnLoading: { backgroundColor: "#374151" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
