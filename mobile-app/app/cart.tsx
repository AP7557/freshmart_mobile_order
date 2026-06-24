import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/store/cart';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { MenuData, ModifierOption } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();
  const { data } = useQuery<MenuData>({
    queryKey: ['menu'],
    queryFn: () => apiFetch('/api/menu'),
  });
  const allOptions: ModifierOption[] = data?.modifierOptions ?? [];

  if (items.length === 0) {
    return (
      <SafeAreaView className='flex-1 bg-background items-center justify-center px-6 gap-4'>
        <Text className='text-5xl'>🛒</Text>
        <Text className='text-xl font-bold text-foreground'>
          Your cart is empty
        </Text>
        <Text className='text-sm text-muted-foreground text-center'>
          Add items from the menu to get started.
        </Text>
        <Button onPress={() => router.push('/menu')} className='mt-2'>
          Browse Menu
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['bottom']}>
      <ScrollView
        className='flex-1'
        contentContainerClassName='p-4 gap-3 pb-28'
      >
        {items.map((ci) => {
          const selOpts = ci.selectedModifierOptionIds
            .map((id) => allOptions.find((o) => o.id === id))
            .filter((o): o is ModifierOption => !!o);
          return (
            <Card key={ci.cartId}>
              <CardContent className='p-4 gap-3'>
                <View className='flex-row items-start gap-3'>
                  <View className='flex-1'>
                    <Text className='text-base font-bold text-foreground'>
                      {ci.item.name}
                    </Text>
                    {selOpts.length > 0 && (
                      <View className='mt-1 gap-0.5'>
                        {selOpts.map((o) => (
                          <Text
                            key={o.id}
                            className='text-xs text-muted-foreground'
                          >
                            ✓ {o.name}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Button
                    variant='ghost'
                    size='icon'
                    onPress={() => removeItem(ci.cartId)}
                  >
                    <Text className='text-destructive text-lg'>✕</Text>
                  </Button>
                </View>
                <View className='flex-row items-center justify-between'>
                  <View className='flex-row items-center gap-4'>
                    <Button
                      variant='outline'
                      size='icon'
                      onPress={() => updateQuantity(ci.cartId, ci.quantity - 1)}
                    >
                      <Text>−</Text>
                    </Button>
                    <Text className='text-base font-bold text-foreground min-w-[24px] text-center'>
                      {ci.quantity}
                    </Text>
                    <Button
                      variant='outline'
                      size='icon'
                      onPress={() => updateQuantity(ci.cartId, ci.quantity + 1)}
                    >
                      <Text>+</Text>
                    </Button>
                  </View>
                  <Text className='text-base font-bold text-foreground'>
                    ${((ci.unitPrice * ci.quantity) / 100).toFixed(2)}
                  </Text>
                </View>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className='p-4 gap-2'>
            <View className='flex-row justify-between'>
              <Text className='text-sm text-muted-foreground'>
                Estimated Subtotal
              </Text>
              <Text className='text-base font-bold text-foreground'>
                ${(subtotal() / 100).toFixed(2)}
              </Text>
            </View>
            <Text className='text-xs text-muted-foreground'>
              Final total calculated at checkout.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
      <View className='absolute bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4'>
        <Button
          size='lg'
          onPress={() => router.push('/checkout')}
          className='w-full'
        >
          <Text>Proceed to Checkout →</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
