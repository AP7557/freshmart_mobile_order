import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useCartStore } from '@/store/cart';
import {
  MenuData,
  Item,
  MenuModifier,
  ModifierOption,
  CartItem,
} from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ModifierSelectionMap = Record<number, number[]>; // modifierId → selected optionIds

/**
 * MenuModifier has one row per item assignment.
 * Filter to this item's rows, deduplicate by modifierId, then sort.
 */
function buildSteps(
  item: Item,
  modifiers: MenuModifier[],
  allOptions: ModifierOption[],
) {
  const seen = new Set<number>();
  return modifiers
    .filter((m) => m.itemId === item.id)
    .filter((m) => {
      if (seen.has(m.modifierId)) return false;
      seen.add(m.modifierId);
      return true;
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((mod) => ({
      modifier: mod,
      options: allOptions.filter((o) => o.modifierId === mod.modifierId),
    }));
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCartStore();
  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ['menu'],
    queryFn: async () => {
      const response = await apiFetch('/api/menu');
      return (response as { data: MenuData }).data;
    },
  });

  const item = (data?.items ?? []).find((i) => String(i.id) === id);
  const steps = useMemo(() => {
    if (!item || !data) return [];
    return buildSteps(item, data.modifiers, data.modifierOptions);
  }, [item, data]);

  const [step, setStep] = useState(0);
  const [modifierSelection, setModifierSelection] =
    useState<ModifierSelectionMap>({});
  const [qty, setQty] = useState(1);

  if (isLoading || !item) {
    return (
      <SafeAreaView className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator size='large' />
      </SafeAreaView>
    );
  }

  const currentStep = steps[step];
  const totalSteps = steps.length;
  const isLastStep = step === totalSteps - 1 || totalSteps === 0;

  useEffect(() => {
    if (steps.length === 0) return;
    const defaults: ModifierSelectionMap = {};
    steps.forEach(({ modifier, options }) => {
      const defaultOpt = options.find((o) => o.isDefault); // or o.is_default depending on your camelCase mapping
      if (defaultOpt) {
        defaults[modifier.modifierId] = [defaultOpt.id];
      }
    });
    if (Object.keys(defaults).length > 0) {
      setModifierSelection(defaults);
    }
  }, [steps]);

  function toggleOption(modId: number, opt: ModifierOption, multi: boolean) {
    setModifierSelection((prev) => {
      const current = prev[modId] ?? [];
      if (multi) {
        return current.includes(opt.id)
          ? { ...prev, [modId]: current.filter((x) => x !== opt.id) }
          : { ...prev, [modId]: [...current, opt.id] };
      }
      return { ...prev, [modId]: [opt.id] };
    });
  }

  function canProceed() {
    if (!currentStep || !currentStep.modifier.required) return true;
    return (
      (modifierSelection[currentStep.modifier.modifierId] ?? []).length > 0
    );
  }

  function handleAddToCart() {
    // Narrows `item` from `Item | undefined` to `Item` inside this function scope
    if (!item) return;

    const selectedIds = Object.values(modifierSelection).flat();

    const modifierDelta = selectedIds.reduce((sum, oid) => {
      const opt = data?.modifierOptions.find((o) => o.id === oid);
      return sum + (opt?.priceDelta ?? 0);
    }, 0);

    const unitPrice = item.basePrice + modifierDelta; // ✅ item is Item here
    const lineTotal = unitPrice * qty;

    const cartItem: CartItem = {
      cartId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, // ✅
      item, // ✅ Item, not Item | undefined
      quantity: qty,
      unitPrice,
      lineTotal,
      lineDiscount: 0,
      selectedModifierOptionIds: selectedIds,
    };

    addItem(cartItem);
    router.back();
  }

  const extraCents = Object.entries(modifierSelection).reduce(
    (acc, [, optIds]) =>
      acc +
      optIds.reduce((sum, oid) => {
        const opt = data?.modifierOptions.find((o) => o.id === oid);
        return sum + (opt?.priceDelta ?? 0);
      }, 0),
    0,
  );
  const unitTotal = item.basePrice + extraCents;

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['bottom']}>
      <ScrollView className='flex-1' contentContainerClassName='pb-36'>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className='w-full h-52 bg-muted'
            resizeMode='cover'
          />
        ) : (
          <View className='w-full h-52 bg-muted items-center justify-center'>
            <Text className='text-5xl'>🍽️</Text>
          </View>
        )}

        <View className='p-4 gap-4'>
          {/* Item header */}
          <View>
            <Text className='text-2xl font-extrabold text-foreground'>
              {item.name}
            </Text>
            {item.description ? (
              <Text className='text-sm text-muted-foreground mt-1'>
                {item.description}
              </Text>
            ) : null}
            <Text className='text-base font-bold text-primary mt-2'>
              ${(unitTotal / 100).toFixed(2)} each
            </Text>
          </View>

          {/* Step progress bar */}
          {totalSteps > 0 && (
            <View className='flex-row items-center gap-1.5'>
              {steps.map((s, i) => (
                <View
                  key={s.modifier.modifierId}
                  className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </View>
          )}

          {/* Current step card */}
          {currentStep && (
            <Card>
              <CardContent className='p-4 gap-3'>
                <View className='flex-row items-center justify-between'>
                  <Text className='text-base font-bold text-foreground'>
                    {currentStep.modifier.modifierName}
                  </Text>
                  <View className='flex-row gap-1.5 items-center'>
                    {currentStep.modifier.required && (
                      <Badge variant='destructive'>
                        <Text>Required</Text>
                      </Badge>
                    )}
                    <Text className='text-xs text-muted-foreground'>
                      Step {step + 1}/{totalSteps}
                    </Text>
                  </View>
                </View>

                <Text className='text-xs text-muted-foreground -mt-1'>
                  {currentStep.modifier.modifierType === 'single'
                    ? 'Pick one'
                    : `Pick up to ${currentStep.modifier.maxChoices ?? '∞'}`}
                </Text>

                <View className='gap-2'>
                  {currentStep.options.map((opt) => {
                    const selected = (
                      modifierSelection[currentStep.modifier.modifierId] ?? []
                    ).includes(opt.id);
                    return (
                      <Button
                        key={opt.id}
                        variant={selected ? 'default' : 'outline'}
                        onPress={() =>
                          toggleOption(
                            currentStep.modifier.modifierId,
                            opt,
                            currentStep.modifier.modifierType === 'multiple',
                          )
                        }
                        className='w-full flex-row justify-between'
                      >
                        <Text
                          className={
                            selected
                              ? 'text-primary-foreground font-semibold'
                              : 'text-foreground'
                          }
                        >
                          {selected ? '✓ ' : ''}
                          {opt.name}
                        </Text>
                        {opt.priceDelta !== 0 && (
                          <Text className='text-xs opacity-70'>
                            {opt.priceDelta > 0 ? '+' : ''}
                            {(opt.priceDelta / 100).toFixed(2)}
                          </Text>
                        )}
                      </Button>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          )}

          {/* Running summary of choices */}
          {Object.keys(modifierSelection).length > 0 && (
            <View className='gap-1.5'>
              <Text className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                Your choices
              </Text>
              {Object.entries(modifierSelection).map(([modId, optIds]) => {
                const mod = data?.modifiers.find(
                  (m) => m.modifierId === Number(modId),
                );
                const opts = optIds
                  .map(
                    (oid) =>
                      data?.modifierOptions.find((o) => o.id === oid)?.name,
                  )
                  .filter(Boolean);
                if (!mod || opts.length === 0) return null;
                return (
                  <Text key={modId} className='text-xs text-muted-foreground'>
                    <Text className='font-semibold text-foreground'>
                      {mod.modifierName}:{' '}
                    </Text>
                    {opts.join(', ')}
                  </Text>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View className='absolute bottom-0 left-0 right-0 bg-background border-t border-border px-4 pt-3 pb-4 gap-3'>
        {/* Qty + price */}
        <View className='flex-row items-center justify-between'>
          <View className='flex-row items-center gap-4'>
            <Button
              variant='outline'
              size='icon'
              onPress={() => setQty(Math.max(1, qty - 1))}
            >
              <Text>−</Text>
            </Button>
            <Text className='text-base font-bold text-foreground min-w-[24px] text-center'>
              {qty}
            </Text>
            <Button
              variant='outline'
              size='icon'
              onPress={() => setQty(qty + 1)}
            >
              <Text>+</Text>
            </Button>
          </View>
          <Text className='text-base font-bold text-foreground'>
            ${((unitTotal * qty) / 100).toFixed(2)}
          </Text>
        </View>

        {/* Navigation */}
        {!isLastStep ? (
          <View className='flex-row gap-2'>
            {step > 0 && (
              <Button
                variant='outline'
                onPress={() => setStep((s) => s - 1)}
                className='flex-1'
              >
                <Text>← Back</Text>
              </Button>
            )}
            <Button
              onPress={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className='flex-1'
            >
              <Text>Next →</Text>
            </Button>
          </View>
        ) : (
          <View className='flex-row gap-2'>
            {totalSteps > 0 && step > 0 && (
              <Button
                variant='outline'
                onPress={() => setStep((s) => s - 1)}
                className='flex-1'
              >
                <Text>← Back</Text>
              </Button>
            )}
            <Button
              size='lg'
              onPress={handleAddToCart}
              disabled={!canProceed()}
              className='flex-1'
            >
              <Text>Add to Cart</Text>
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
