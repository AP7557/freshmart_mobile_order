import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Item, Modifier, ModifierOption } from '@/types';
import { useCartStore } from '@/store/cart';
// React Native 0.73+ exposes crypto.randomUUID() globally

interface MenuData {
  items: Item[];
  modifiers: Modifier[];
  modifierOptions: ModifierOption[];
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ['menu'],
    queryFn: () => apiFetch('/api/menu'),
  });

  const item = data?.items.find((i) => String(i.id) === id);
  const itemModifiers =
    data?.modifiers.filter((m) => String(m.itemId) === id) ?? [];
  const allOptions = data?.modifierOptions ?? [];

  const [selectedOptions, setSelectedOptions] = useState<
    Record<number, number[]>
  >({});
  const [quantity, setQuantity] = useState(1);

  function toggleOption(
    modifierId: number,
    optionId: number,
    type: 'single' | 'multiple',
    maxChoices: number | null,
  ) {
    setSelectedOptions((prev) => {
      const current = prev[modifierId] ?? [];
      if (type === 'single') return { ...prev, [modifierId]: [optionId] };
      if (current.includes(optionId)) {
        return {
          ...prev,
          [modifierId]: current.filter((id) => id !== optionId),
        };
      }
      if (maxChoices && current.length >= maxChoices) return prev;
      return { ...prev, [modifierId]: [...current, optionId] };
    });
  }

  function validate(): string | null {
    for (const mod of itemModifiers) {
      if (mod.required && !selectedOptions[mod.modifierId]?.length) {
        return `Please select an option for "${mod.modifierName}"`;
      }
    }
    return null;
  }

  function handleAddToCart() {
    const error = validate();
    if (error) {
      alert(error);
      return;
    }
    const optionIds = Object.values(selectedOptions).flat();
    const optionPriceDeltas = optionIds.reduce((sum, oid) => {
      const opt = allOptions.find((o) => o.id === oid);
      return sum + (opt?.priceDelta ?? 0);
    }, 0);
    addItem({
      cartId: crypto.randomUUID(),
      item: item!,
      quantity,
      selectedModifierOptionIds: optionIds,
      unitPrice: item!.basePrice + optionPriceDeltas,
    });
    router.push('/cart');
  }

  if (isLoading || !item)
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' color='#3b82f6' />
      </View>
    );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode='cover'
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>${(item.basePrice / 100).toFixed(2)}</Text>
          {item.description ? (
            <Text style={styles.desc}>{item.description}</Text>
          ) : null}

          {itemModifiers.map((mod) => {
            const options = allOptions.filter(
              (o) => o.modifierId === mod.modifierId,
            );
            const selected = selectedOptions[mod.modifierId] ?? [];
            return (
              <View key={mod.modifierId} style={styles.modifierGroup}>
                <Text style={styles.modifierTitle}>
                  {mod.modifierName}
                  {mod.required ? (
                    <Text style={styles.required}> *</Text>
                  ) : null}
                </Text>
                {mod.modifierType === 'multiple' && mod.maxChoices && (
                  <Text style={styles.modifierHint}>
                    Choose up to {mod.maxChoices}
                  </Text>
                )}
                {options.map((opt) => {
                  const isSelected = selected.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.option,
                        isSelected && styles.optionSelected,
                      ]}
                      onPress={() =>
                        toggleOption(
                          mod.modifierId,
                          opt.id,
                          mod.modifierType,
                          mod.maxChoices,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {opt.name}
                        {opt.priceDelta !== 0
                          ? ` (+$${(opt.priceDelta / 100).toFixed(2)})`
                          : ''}
                      </Text>
                      {isSelected && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => q + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
          <Text style={styles.addBtnText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 120 },
  image: { width: '100%', height: 240 },
  imagePlaceholder: { backgroundColor: '#e5e7eb' },
  content: { padding: 16, gap: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  price: { fontSize: 18, fontWeight: '600', color: '#3b82f6' },
  desc: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  modifierGroup: { gap: 8 },
  modifierTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  required: { color: '#ef4444' },
  modifierHint: { fontSize: 12, color: '#9ca3af' },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextSelected: { color: '#1d4ed8', fontWeight: '600' },
  check: { color: '#3b82f6', fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    gap: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '600', color: '#111827' },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 30,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
