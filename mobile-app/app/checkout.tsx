import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useMutation } from '@tanstack/react-query';
import { useCartStore } from '../store/cart';
import { apiFetch } from '../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OrderConfirmation } from '../types';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discountTotal = useCartStore((s) => s.discountTotal());
  const taxTotal = useCartStore((s) => s.taxTotal());
  const total = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clearCart);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  function validate(): boolean {
    let valid = true;
    if (!name.trim()) {
      setNameErr('Name is required');
      valid = false;
    } else {
      setNameErr('');
    }
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 10) {
      setPhoneErr('Enter a valid 10-digit US phone number');
      valid = false;
    } else {
      setPhoneErr('');
    }
    return valid;
  }

  const checkout = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error('validation');

      // Step 1 — create order + PaymentIntent on the server in one call
      // Server field names: "lines" and "modifierOptionIds"
      const orderRes = await apiFetch<OrderConfirmation>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.replace(/[^\d]/g, ''),
          lines: items.map((i) => ({
            itemId: i.item.id,
            quantity: i.quantity,
            modifierOptionIds: i.selectedModifierOptionIds,
          })),
        }),
      });

      const { orderId, clientSecret } = orderRes.data;

      // Step 2 — init PaymentSheet (publishableKey is already in StripeProvider in _layout.tsx)
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Freshmart Edison',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: name.trim(),
          phone: phone.replace(/[^\d]/g, ''),
        },
        appearance: {
          colors: {
            primary: '#1a6b3c',
            background: '#ffffff',
            componentBackground: '#f0f9ea',
            componentBorder: '#d1ead8',
            componentDivider: '#d1ead8',
            primaryText: '#0d3d20',
            secondaryText: '#4a7a5a',
            placeholderText: '#9ab8a4',
          },
          shapes: { borderRadius: 12, borderWidth: 1.0 },
        },
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
      });

      if (initError) throw new Error(initError.message);

      // Step 3 — present sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return null;
        throw new Error(presentError.message);
      }

      clearCart();
      return orderId;
    },

    onSuccess: (orderId) => {
      if (orderId) router.replace(`/order-confirmation/${orderId}`);
    },

    onError: (e: Error) => {
      if (e.message !== 'validation') Alert.alert('Payment failed', e.message);
    },
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#f0f9ea' }}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* ── Contact info ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Info</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder='Jane Smith'
              placeholderTextColor='#9ab8a4'
              value={name}
              onChangeText={setName}
              autoCapitalize='words'
              returnKeyType='next'
            />
            {!!nameErr && <Text style={styles.error}>{nameErr}</Text>}

            <Text style={[styles.label, { marginTop: 12 }]}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder='(555) 000-0000'
              placeholderTextColor='#9ab8a4'
              value={phone}
              onChangeText={setPhone}
              keyboardType='phone-pad'
              returnKeyType='done'
            />
            {!!phoneErr && <Text style={styles.error}>{phoneErr}</Text>}
          </View>

          {/* ── Order summary ── */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            {items.map((item) => (
              <View key={item.cartId} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {item.quantity}× {item.item.name}
                </Text>
                <Text style={styles.rowValue}>{fmt(item.lineTotal)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Subtotal</Text>
              <Text style={styles.rowValue}>{fmt(subtotal)}</Text>
            </View>

            {discountTotal > 0 && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: '#1a6b3c' }]}>
                  Discount
                </Text>
                <Text style={[styles.rowValue, { color: '#1a6b3c' }]}>
                  -{fmt(discountTotal)}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tax</Text>
              <Text style={styles.rowValue}>{fmt(taxTotal)}</Text>
            </View>

            <View style={[styles.row, { marginTop: 4 }]}>
              <Text
                style={[styles.rowLabel, { fontWeight: '700', fontSize: 16 }]}
              >
                Total
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { fontWeight: '700', fontSize: 16, color: '#1a6b3c' },
                ]}
              >
                {fmt(total)}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ── Pay button ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, checkout.isPending && { opacity: 0.7 }]}
            disabled={checkout.isPending}
            onPress={() => checkout.mutate()}
            activeOpacity={0.8}
          >
            {checkout.isPending ? (
              <ActivityIndicator color='#ffffff' />
            ) : (
              <Text style={styles.payButtonText}>Pay {fmt(total)}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.caption}>
            Secured by Stripe · Ready in ~30 min
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0d3d20',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#4a7a5a',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1ead8',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f0f9ea',
    color: '#0d3d20',
  },
  error: { fontSize: 12, color: '#c0392b', marginTop: 4 },
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  rowLabel: { fontSize: 14, color: '#4a7a5a', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 14, color: '#0d3d20', fontWeight: '500' as const },
  divider: { height: 1, backgroundColor: '#d1ead8', marginVertical: 8 },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1ead8',
    backgroundColor: '#ffffff',
  },
  payButton: {
    backgroundColor: '#1a6b3c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  payButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' as const },
  caption: {
    fontSize: 12,
    color: '#9ab8a4',
    textAlign: 'center' as const,
    marginTop: 8,
  },
};
