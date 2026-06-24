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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { items, subtotal, discountTotal, clearCart } = useCartStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  function validate() {
    let valid = true;
    if (!name.trim()) {
      setNameErr('Name is required');
      valid = false;
    } else setNameErr('');
    if (phone.replace(/[^\d]/g, '').length < 10) {
      setPhoneErr('Enter a valid 10-digit phone');
      valid = false;
    } else setPhoneErr('');
    return valid;
  }

  const checkout = useMutation({
    mutationFn: async () => {
      if (!validate()) throw new Error('validation');

      // FIX #1: POST /api/orders now returns clientSecret directly.
      //         No second call to /api/orders/payment-intent needed.
      // FIX #8: Field name is modifierOptionIds (matches server OrderLineSchema).
      const orderRes = await apiFetch<{
        data: {
          orderId: number;
          clientSecret: string;
          pricing: {
            subtotal: number;
            discountTotal: number;
            taxTotal: number;
            total: number;
          };
          estimatedReadyAt: string;
        };
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.replace(/[^\d]/g, ''),
          lines: items.map((i) => ({
            itemId: i.item.id,
            quantity: i.quantity,
            modifierOptionIds: i.selectedModifierOptionIds, // FIX #8
          })),
        }),
      });

      const { orderId, clientSecret } = orderRes.data; // FIX #1

      const { error: initErr } = await initPaymentSheet({
        merchantDisplayName: 'Freshmart Edison',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          name: name.trim(),
          phone: phone.replace(/[^\d]/g, ''),
        },
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
      });
      if (initErr) throw new Error(initErr.message);

      const { error: presentErr } = await presentPaymentSheet();
      if (presentErr) {
        if (presentErr.code === 'Canceled') return null;
        throw new Error(presentErr.message);
      }

      clearCart();
      return { orderId };
    },
    onSuccess: (result) => {
      if (result) router.replace(`/order-confirmation/${result.orderId}`);
    },
    onError: (err: Error) => {
      if (err.message !== 'validation')
        Alert.alert('Payment failed', err.message);
    },
  });

  const sub = subtotal();
  const disc = discountTotal();

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['bottom']}>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className='flex-1'
          contentContainerClassName='p-4 gap-4 pb-32'
          keyboardShouldPersistTaps='handled'
        >
          <Card>
            <CardContent className='p-4 gap-3'>
              <Text className='text-base font-bold text-foreground'>
                Your Info
              </Text>
              <View className='gap-1.5'>
                <Label nativeID='name-label'>Name</Label>
                <Input
                  accessibilityLabelledBy='name-label'
                  placeholder='Jane Smith'
                  value={name}
                  onChangeText={setName}
                  autoCapitalize='words'
                  textContentType='name'
                />
                {!!nameErr && (
                  <Text className='text-xs text-destructive'>{nameErr}</Text>
                )}
              </View>
              <View className='gap-1.5'>
                <Label nativeID='phone-label'>Phone Number</Label>
                <Input
                  accessibilityLabelledBy='phone-label'
                  placeholder='(555) 000-0000'
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType='phone-pad'
                  textContentType='telephoneNumber'
                />
                {!!phoneErr && (
                  <Text className='text-xs text-destructive'>{phoneErr}</Text>
                )}
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-4 gap-2'>
              <Text className='text-base font-bold text-foreground mb-1'>
                Order Summary
              </Text>
              {items.map((item) => (
                <View key={item.cartId} className='flex-row justify-between'>
                  <Text
                    className='text-sm text-muted-foreground flex-1 mr-2'
                    numberOfLines={1}
                  >
                    {item.quantity}× {item.item.name}
                  </Text>
                  <Text className='text-sm text-foreground'>
                    {fmt(item.unitPrice * item.quantity)}
                  </Text>
                </View>
              ))}
              <View className='h-px bg-border my-1' />
              <View className='flex-row justify-between'>
                <Text className='text-sm text-muted-foreground'>Subtotal</Text>
                <Text className='text-sm'>{fmt(sub)}</Text>
              </View>
              {disc > 0 && (
                <View className='flex-row justify-between'>
                  <Text className='text-sm text-green-600'>Discount</Text>
                  <Text className='text-sm text-green-600'>-{fmt(disc)}</Text>
                </View>
              )}
              {/* FIX #2: Tax computed server-side at 8.875% NYC only.
                  Old cart store used 6.25% NJ — different from what Stripe charged. */}
              <View className='flex-row justify-between'>
                <Text className='text-sm text-muted-foreground'>Tax</Text>
                <Text className='text-sm text-muted-foreground'>
                  Calculated at checkout
                </Text>
              </View>
              <View className='h-px bg-border my-1' />
              <View className='flex-row justify-between'>
                <Text className='text-base font-bold text-foreground'>
                  Est. Pre-Tax Total
                </Text>
                <Text className='text-base font-bold text-primary'>
                  {fmt(sub - disc)}
                </Text>
              </View>
              <Text className='text-xs text-muted-foreground'>
                Final total with tax confirmed before payment
              </Text>
            </CardContent>
          </Card>
        </ScrollView>

        <View className='absolute bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 gap-2'>
          <Button
            size='lg'
            disabled={checkout.isPending}
            onPress={() => checkout.mutate()}
            className='w-full'
          >
            {checkout.isPending ? 'Processing…' : 'Place Order & Pay'}
          </Button>
          <Text className='text-xs text-muted-foreground text-center'>
            Secured by Stripe · Ready in ~30 min
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
