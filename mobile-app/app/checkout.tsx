import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useMutation } from '@tanstack/react-query';
import { useCartStore } from '../store/cart';
import { apiFetch } from '../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, discountTotal, taxTotal, clearCart } =
    useCartStore();

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

      // Step 1 — create order draft on the server (server recalculates totals)
      const orderRes = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.replace(/[^\d]/g, ''),
          items: items.map((i) => ({
            itemId: i.item.id,
            quantity: i.quantity,
            selectedModifierOptionIds: i.selectedModifierOptionIds,
          })),
        }),
      });
      const orderId: number = orderRes.data.id;

      // Step 2 — fetch PaymentIntent client secret (Dahlia 2026-05-27)
      const piRes = await apiFetch('/api/orders/payment-intent', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      const { clientSecret } = piRes.data;

      // Step 3 — initialise PaymentSheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Freshmart Edison',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: name.trim(),
          phone: phone.replace(/[^\d]/g, ''),
        },
        // Visual theming
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
          shapes: {
            borderRadius: 12,
            borderWidth: 1.0,
          },
        },
        // Native wallets — Apple Pay / Google Pay
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
      });

      if (initError) throw new Error(initError.message);

      // Step 4 — present the sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return null; // user dismissed
        throw new Error(presentError.message);
      }

      // Step 5 — success
      clearCart();
      return orderId;
    },

    onSuccess: (orderId) => {
      if (orderId) router.replace(`/order-confirmation/${orderId}`);
    },

    onError: (err: Error) => {
      if (err.message !== 'validation') {
        Alert.alert('Payment failed', err.message);
      }
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
            <input
              style={styles.input}
              placeholder='Jane Smith'
              value={name}
              onChange={(e: any) =>
                setName(e.nativeEvent?.text ?? e.target?.value ?? '')
              }
            />
            {!!nameErr && <Text style={styles.error}>{nameErr}</Text>}

            <Text style={[styles.label, { marginTop: 12 }]}>Phone Number</Text>
            <input
              style={styles.input}
              placeholder='(555) 000-0000'
              value={phone}
              onChange={(e: any) =>
                setPhone(e.nativeEvent?.text ?? e.target?.value ?? '')
              }
            />
            {!!phoneErr && <Text style={styles.error}>{phoneErr}</Text>}
          </View>

          {/* ── Order summary ── */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            {items.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {item.quantity}× {item.name}
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
          <button
            style={{
              ...styles.payButton,
              opacity: checkout.isPending ? 0.7 : 1,
            }}
            disabled={checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            <Text style={styles.payButtonText}>
              {checkout.isPending ? 'Processing…' : `Pay ${fmt(total)}`}
            </Text>
          </button>
          <Text style={styles.caption}>
            Secured by Stripe · Ready in ~30 min
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles: Record<string, any> = {
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
    fontWeight: '700',
    color: '#0d3d20',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#4a7a5a', marginBottom: 4 },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowLabel: { fontSize: 14, color: '#4a7a5a', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 14, color: '#0d3d20', fontWeight: '500' },
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
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    border: 'none',
    cursor: 'pointer',
  },
  payButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  caption: {
    fontSize: 12,
    color: '#9ab8a4',
    textAlign: 'center',
    marginTop: 8,
  },
};
