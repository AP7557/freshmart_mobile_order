import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { MenuData, MenuModifier, ModifierOption } from "@/types";
import { useCartStore } from "@/store/cart";
import { nanoid } from "@/lib/nanoid";

interface WizardStep { modifier: MenuModifier; options: ModifierOption[]; }
const CATEGORY_ICONS: Record<string, string> = {
  "Bread / Base": "🍞", Protein: "🥩", Cheese: "🧀", Vegetables: "🥬",
  "Sauce / Dressing": "🫙", "Spice Level": "🌶️", "Extras / Add-ons": "➕",
  Size: "📏", Temperature: "🌡️", Other: "⚙️",
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const { data, isLoading } = useQuery<MenuData>({ queryKey: ["menu"], queryFn: () => apiFetch("/api/menu") });
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const item = useMemo(() => data?.items.find((i) => i.id === Number(id)), [data, id]);
  const steps: WizardStep[] = useMemo(() => {
    if (!data || !item) return [];
    return data.modifiers.filter((m) => m.itemId === item.id).sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({ modifier: m, options: data.modifierOptions.filter((o) => o.modifierId === m.modifierId) }));
  }, [data, item]);
  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const delta = Object.values(selections).flat().reduce((sum, oid) =>
      sum + (data?.modifierOptions.find((o) => o.id === oid)?.priceDelta ?? 0), 0);
    return item.basePrice + delta;
  }, [item, selections, data]);
  const toggleOption = useCallback((modifier: MenuModifier, optionId: number) => {
    setSelections((prev) => {
      const cur = prev[modifier.modifierId] ?? [];
      if (modifier.modifierType === "single") return { ...prev, [modifier.modifierId]: [optionId] };
      if (cur.includes(optionId)) return { ...prev, [modifier.modifierId]: cur.filter((x) => x !== optionId) };
      if (modifier.maxChoices && cur.length >= modifier.maxChoices) {
        Alert.alert("Limit Reached", `You can choose up to ${modifier.maxChoices}.`); return prev;
      }
      return { ...prev, [modifier.modifierId]: [...cur, optionId] };
    });
  }, []);
  const goNext = useCallback(() => {
    const step = steps[stepIndex];
    if (step?.modifier.required && (selections[step.modifier.modifierId] ?? []).length === 0) {
      Alert.alert("Required", `Please choose "${step.modifier.modifierName}".`); return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, steps, selections]);
  const handleAddToCart = useCallback(() => {
    if (!item) return;
    addItem({ cartId: nanoid(), item, quantity: qty, selectedModifierOptionIds: Object.values(selections).flat(), unitPrice });
    Alert.alert("Added! 🛒", `${item.name} × ${qty}`, [
      { text: "Keep Shopping", onPress: () => router.back() },
      { text: "View Cart →", onPress: () => router.push("/cart") },
    ]);
  }, [item, selections, qty, unitPrice, addItem, router]);

  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (!item) return <View style={s.center}><Text style={{ fontSize: 40 }}>😕</Text><Text style={s.notFoundText}>Item not found</Text><TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Text style={s.backBtnText}>← Go Back</Text></TouchableOpacity></View>;
  const onReview = stepIndex >= steps.length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {steps.length > 0 && (
        <View style={s.progressRow}>
          {steps.map((_, i) => <View key={i} style={[s.progressSeg, i < stepIndex && s.progressDone, i === stepIndex && s.progressActive]} />)}
          <View style={[s.progressSeg, onReview && s.progressActive]} />
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {(stepIndex === 0 || onReview) && (
          <View style={s.itemHeader}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.heroImg} resizeMode="cover" /> : <View style={[s.heroImg, s.heroImgFallback]}><Text style={{ fontSize: 64 }}>🥪</Text></View>}
            <View style={s.heroText}><Text style={s.heroName}>{item.name}</Text>{!!item.description && <Text style={s.heroDesc}>{item.description}</Text>}</View>
          </View>
        )}
        {!onReview && steps[stepIndex] && (
          <WizardStepView step={steps[stepIndex]} stepNumber={stepIndex + 1} totalSteps={steps.length}
            selected={selections[steps[stepIndex].modifier.modifierId] ?? []}
            onToggle={(optId) => toggleOption(steps[stepIndex].modifier, optId)} />
        )}
        {onReview && (
          <ReviewScreen steps={steps} selections={selections} allOptions={data?.modifierOptions ?? []}
            unitPrice={unitPrice} qty={qty} onChangeQty={setQty} onEditStep={(i) => setStepIndex(i)} />
        )}
      </ScrollView>
      <View style={s.footer}>
        {stepIndex > 0 && <TouchableOpacity style={s.backPill} onPress={() => setStepIndex((i) => Math.max(0, i - 1))} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}><Text style={s.backPillText}>← Back</Text></TouchableOpacity>}
        {!onReview ? (
          <View style={s.nextGroup}>
            {!steps[stepIndex]?.modifier.required && <TouchableOpacity style={s.skipPill} onPress={() => setStepIndex((i) => i + 1)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}><Text style={s.skipPillText}>Skip</Text></TouchableOpacity>}
            <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>{stepIndex === steps.length - 1 ? "Review Order →" : "Next →"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={handleAddToCart} activeOpacity={0.85}>
            <Text style={s.addBtnText}>Add to Cart  •  ${((unitPrice * qty) / 100).toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function WizardStepView({ step, stepNumber, totalSteps, selected, onToggle }: { step: WizardStep; stepNumber: number; totalSteps: number; selected: number[]; onToggle: (optId: number) => void; }) {
  const { modifier, options } = step;
  const icon = CATEGORY_ICONS[modifier.category] ?? "⚙️";
  return (
    <View style={ws.wrap}>
      <View style={ws.header}>
        <Text style={ws.stepNum}>Step {stepNumber} of {totalSteps}</Text>
        <View style={ws.chip}><Text style={ws.chipText}>{icon} {modifier.category}</Text></View>
      </View>
      <Text style={ws.title}>{modifier.modifierName}</Text>
      {!modifier.required && <Text style={ws.hint}>Optional — tap Skip to continue</Text>}
      {modifier.modifierType === "multiple" && modifier.maxChoices && <Text style={ws.hint}>Choose up to {modifier.maxChoices}</Text>}
      {modifier.modifierType === "single" && <Text style={ws.hint}>Choose one</Text>}
      <View style={ws.list}>
        {options.map((opt) => {
          const sel = selected.includes(opt.id);
          return (
            <TouchableOpacity key={opt.id} style={[ws.option, sel && ws.optionSel]} onPress={() => onToggle(opt.id)} activeOpacity={0.8}>
              <View style={[ws.indicator, sel && ws.indicatorSel]}>{sel && <View style={ws.indicatorDot} />}</View>
              <Text style={[ws.optName, sel && ws.optNameSel]}>{opt.name}</Text>
              {opt.priceDelta !== 0 && <Text style={[ws.delta, opt.priceDelta > 0 ? ws.deltaPos : ws.deltaNeg]}>{opt.priceDelta > 0 ? "+" : ""}${(opt.priceDelta / 100).toFixed(2)}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ReviewScreen({ steps, selections, allOptions, unitPrice, qty, onChangeQty, onEditStep }: { steps: WizardStep[]; selections: Record<number, number[]>; allOptions: ModifierOption[]; unitPrice: number; qty: number; onChangeQty: (n: number) => void; onEditStep: (i: number) => void; }) {
  return (
    <View style={rv.wrap}>
      <Text style={rv.title}>Review Your Order</Text>
      {steps.map((step, i) => {
        const ids = selections[step.modifier.modifierId] ?? [];
        const opts = ids.map((id) => allOptions.find((o) => o.id === id)).filter((o): o is ModifierOption => !!o);
        return (
          <View key={step.modifier.modifierId} style={rv.row}>
            <View style={{ flex: 1 }}>
              <Text style={rv.rowLabel}>{step.modifier.modifierName}</Text>
              {opts.length > 0 ? opts.map((o) => <Text key={o.id} style={rv.rowVal}>✓ {o.name}</Text>) : <Text style={rv.rowNone}>None selected</Text>}
            </View>
            <TouchableOpacity onPress={() => onEditStep(i)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}><Text style={rv.edit}>Edit</Text></TouchableOpacity>
          </View>
        );
      })}
      <View style={rv.qtyRow}>
        <Text style={rv.qtyLabel}>Quantity</Text>
        <View style={rv.qtyCtrl}>
          <TouchableOpacity style={rv.qtyBtn} onPress={() => onChangeQty(Math.max(1, qty - 1))}><Text style={rv.qtyBtnTxt}>−</Text></TouchableOpacity>
          <Text style={rv.qtyNum}>{qty}</Text>
          <TouchableOpacity style={rv.qtyBtn} onPress={() => onChangeQty(qty + 1)}><Text style={rv.qtyBtnTxt}>+</Text></TouchableOpacity>
        </View>
      </View>
      <View style={rv.priceCard}>
        <View style={rv.priceRow}><Text style={rv.priceLabel}>Price per item</Text><Text style={rv.priceVal}>${(unitPrice / 100).toFixed(2)}</Text></View>
        <View style={[rv.priceRow, { marginTop: 6 }]}><Text style={rv.totalLabel}>Subtotal</Text><Text style={rv.totalVal}>${((unitPrice * qty) / 100).toFixed(2)}</Text></View>
      </View>
    </View>
  );
}

const ws = StyleSheet.create({ wrap: { padding: 16, gap: 12 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, stepNum: { fontSize: 12, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 }, chip: { backgroundColor: "#111827", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }, chipText: { color: "#fff", fontSize: 12, fontWeight: "600" }, title: { fontSize: 22, fontWeight: "800", color: "#111827" }, hint: { fontSize: 12, color: "#9ca3af", marginTop: -6 }, list: { gap: 8 }, option: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "#e5e7eb", gap: 12 }, optionSel: { borderColor: "#3b82f6", backgroundColor: "#eff6ff" }, indicator: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" }, indicatorSel: { borderColor: "#3b82f6" }, indicatorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#3b82f6" }, optName: { flex: 1, fontSize: 15, fontWeight: "500", color: "#374151" }, optNameSel: { color: "#1d4ed8", fontWeight: "700" }, delta: { fontSize: 13, fontWeight: "600" }, deltaPos: { color: "#6b7280" }, deltaNeg: { color: "#059669" } });
const rv = StyleSheet.create({ wrap: { padding: 16, gap: 10 }, title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 }, row: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 }, rowLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }, rowVal: { fontSize: 14, color: "#374151" }, rowNone: { fontSize: 14, color: "#d1d5db", fontStyle: "italic" }, edit: { fontSize: 13, color: "#3b82f6", fontWeight: "700" }, qtyRow: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, qtyLabel: { fontSize: 15, fontWeight: "600", color: "#374151" }, qtyCtrl: { flexDirection: "row", alignItems: "center", gap: 18 }, qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }, qtyBtnTxt: { fontSize: 22, fontWeight: "600", color: "#111827", lineHeight: 24 }, qtyNum: { fontSize: 18, fontWeight: "700", color: "#111827", minWidth: 28, textAlign: "center" }, priceCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14 }, priceRow: { flexDirection: "row", justifyContent: "space-between" }, priceLabel: { fontSize: 13, color: "#6b7280" }, priceVal: { fontSize: 13, color: "#374151" }, totalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" }, totalVal: { fontSize: 18, fontWeight: "800", color: "#111827" } });
const s = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, notFoundText: { fontSize: 16, color: "#6b7280" }, backBtn: { backgroundColor: "#111827", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 }, backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 }, progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }, progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" }, progressDone: { backgroundColor: "#10b981" }, progressActive: { backgroundColor: "#3b82f6" }, itemHeader: { backgroundColor: "#fff", marginBottom: 4 }, heroImg: { width: "100%", height: 200 }, heroImgFallback: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }, heroText: { padding: 16 }, heroName: { fontSize: 22, fontWeight: "800", color: "#111827" }, heroDesc: { fontSize: 14, color: "#6b7280", marginTop: 4, lineHeight: 20 }, footer: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", padding: 16, flexDirection: "row", gap: 10, alignItems: "center" }, backPill: { paddingHorizontal: 14, paddingVertical: 12 }, backPillText: { fontSize: 15, color: "#6b7280", fontWeight: "600" }, nextGroup: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" }, skipPill: { paddingHorizontal: 14, paddingVertical: 12 }, skipPillText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" }, nextBtn: { flex: 1, backgroundColor: "#111827", borderRadius: 12, padding: 14, alignItems: "center" }, nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 }, addBtn: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 12, padding: 14, alignItems: "center" }, addBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 } });
