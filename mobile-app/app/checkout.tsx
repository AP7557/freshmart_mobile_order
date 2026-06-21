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
  const { items, clearCart } = useCartStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
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
        body: JSON.stringify({ customerName: name.trim(), customerPhone: phone.trim(), lines, promoCode: promoCode || undefined }),
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Your Business",
        paymentIntentClientSecret: result.clientSecret,
        defaultBillingDetails: { name: name.trim(), phone: phone.trim() },
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        Alert.alert("Payment Error", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== "Canceled") {
          Alert.alert("Payment Failed", presentError.message);
        }
        return;
      }

      clearCart();
      router.replace(`/order-confirmation/${result.orderId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Your Details</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Jane Smith"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          value={phone}
          onChangeText={setPhone}
          placeholder="+12125551234"
          keyboardType="phone-pad"
          autoCorrect={false}
          returnKeyType="done"
        />
        {errors.phone && <Text style={styles.error}>{errors.phone}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Promo Code (optional)</Text>
        <TextInput
          style={styles.input}
          value={promoCode}
          onChangeText={setPromoCode}
          placeholder="SAVE10"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          💳 Payment is processed securely via Stripe. Your card details are never stored on our servers.
        </Text>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          ⏱ Estimated wait time will be calculated based on your order size and shown at confirmation.
        </Text>
      </View>

      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleCheckout} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Pay Now</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  field: { gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 10, padding: 12, fontSize: 16, color: "#111827" },
  inputError: { borderColor: "#ef4444" },
  error: { fontSize: 12, color: "#ef4444", marginTop: 2 },
  notice: { backgroundColor: "#f3f4f6", borderRadius: 10, padding: 12 },
  noticeText: { fontSize: 13, color: "#6b7280", lineHeight: 19 },
  btn: { backgroundColor: "#111827", borderRadius: 12, padding: 18, alignItems: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});
