import { useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { MenuData, MenuModifier, ModifierOption } from "@/types";
import { useCartStore } from "@/store/cart";

const ACCENT = "#3b82f6";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ["menu"],
    queryFn: () => apiFetch("/api/menu"),
  });

  const item = data?.items.find((i) => String(i.id) === id);

  const itemModifiers: MenuModifier[] = useMemo(() => {
    if (!data || !id) return [];
    return [...data.modifiers.filter((m) => String(m.itemId) === id)].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [data, id]);

  const allOptions = data?.modifierOptions ?? [];

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);

  const totalSteps = itemModifiers.length;
  const isLastStep = currentStep >= totalSteps;
  const activeMod  = itemModifiers[currentStep];

  function toggleOption(modifierId: number, optionId: number, type: "single" | "multiple", maxChoices: number | null) {
    setSelectedOptions((prev) => {
      const current = prev[modifierId] ?? [];
      if (type === "single") return { ...prev, [modifierId]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [modifierId]: current.filter((x) => x !== optionId) };
      if (maxChoices !== null && current.length >= maxChoices) return prev;
      return { ...prev, [modifierId]: [...current, optionId] };
    });
  }

  function canAdvance(): boolean {
    if (!activeMod) return true;
    if (activeMod.required && !(selectedOptions[activeMod.modifierId]?.length)) return false;
    return true;
  }

  function handleNext() {
    if (!canAdvance()) {
      Alert.alert("Required", `Please select an option for "${activeMod?.modifierName}"`);
      return;
    }
    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else router.back();
  }

  function handleAddToCart() {
    if (!item) return;
    const optionIds = Object.values(selectedOptions).flat();
    const priceDelta = optionIds.reduce((sum, oid) => {
      const opt = allOptions.find((o) => o.id === oid);
      return sum + (opt?.priceDelta ?? 0);
    }, 0);
    addItem({
      cartId: `${Date.now()}-${Math.random()}`,
      item,
      quantity,
      selectedModifierOptionIds: optionIds,
      unitPrice: item.basePrice + priceDelta,
    });
    router.push("/cart");
  }

  if (isLoading || !item) {
    return <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  // ── Summary / Review screen (all steps complete) ─────────────────────────
  if (isLastStep) {
    const allSelectedOpts = Object.values(selectedOptions).flat()
      .map((oid) => allOptions.find((o) => o.id === oid))
      .filter(Boolean) as ModifierOption[];
    const unitPrice = item.basePrice + allSelectedOpts.reduce((sum, o) => sum + o.priceDelta, 0);

    return (
      <View style={s.screen}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {item.imageUrl
            ? <Image source={{ uri: item.imageUrl }} style={s.heroImg} resizeMode="cover" />
            : <View style={[s.heroImg, s.heroImgPlaceholder]}><Text style={{ fontSize: 64 }}>🥪</Text></View>
          }
          <View style={s.pad}>
            <Text style={s.itemName}>{item.name}</Text>
            <Text style={s.summaryHeading}>Your Selections</Text>
            {itemModifiers.map((mod) => {
              const opts = (selectedOptions[mod.modifierId] ?? [])
                .map((oid) => allOptions.find((o) => o.id === oid))
                .filter(Boolean) as ModifierOption[];
              return (
                <View key={mod.modifierId} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{mod.modifierName}</Text>
                  <Text style={s.summaryValue}>{opts.length ? opts.map((o) => o.name).join(", ") : "— skipped"}</Text>
                </View>
              );
            })}
            <Text style={s.summaryHeading}>Quantity</Text>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Text style={s.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qtyValue}>{quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
                <Text style={s.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <View style={s.footer}>
          <TouchableOpacity style={s.backBtn} onPress={() => setCurrentStep(totalSteps - 1)}>
            <Text style={s.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={handleAddToCart} activeOpacity={0.85}>
            <Text style={s.addBtnText}>Add to Cart — ${((unitPrice * quantity) / 100).toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step screen ───────────────────────────────────────────────────────────
  const options = allOptions.filter((o) => o.modifierId === activeMod.modifierId);
  const selected = selectedOptions[activeMod.modifierId] ?? [];

  return (
    <View style={s.screen}>
      {/* Step progress bar */}
      <View style={s.progressBar}>
        {itemModifiers.map((_, i) => (
          <View key={i} style={[s.progressDot, i < currentStep && s.progressDotDone, i === currentStep && s.progressDotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={s.stepHeader}>
          <Text style={s.stepItemName}>{item.name}</Text>
          <Text style={s.stepCount}>Step {currentStep + 1} of {totalSteps}</Text>
        </View>

        <View style={s.pad}>
          <View style={s.categoryChip}>
            <Text style={s.categoryChipText}>{activeMod.category ?? "Selection"}</Text>
          </View>
          <Text style={s.modTitle}>
            {activeMod.modifierName}
            {activeMod.required && <Text style={s.required}> *required</Text>}
          </Text>
          {activeMod.modifierType === "multiple" && activeMod.maxChoices && (
            <Text style={s.modHint}>Choose up to {activeMod.maxChoices}</Text>
          )}
          {activeMod.modifierType === "multiple" && !activeMod.maxChoices && (
            <Text style={s.modHint}>Choose as many as you like</Text>
          )}

          {options.map((opt) => {
            const isOn = selected.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.option, isOn && s.optionSelected]}
                onPress={() => toggleOption(activeMod.modifierId, opt.id, activeMod.modifierType, activeMod.maxChoices)}
                activeOpacity={0.8}
              >
                <View style={s.optionLeft}>
                  <View style={[s.optionRadio, isOn && s.optionRadioSelected]}>
                    {isOn && <View style={s.optionRadioDot} />}
                  </View>
                  <Text style={[s.optionText, isOn && s.optionTextSelected]}>{opt.name}</Text>
                  {opt.isDefault && !isOn && <View style={s.defaultChip}><Text style={s.defaultChipText}>default</Text></View>}
                </View>
                {opt.priceDelta !== 0 && (
                  <Text style={[s.optionPrice, opt.priceDelta > 0 ? s.optionPriceUp : s.optionPriceDown]}>
                    {opt.priceDelta > 0 ? "+" : ""}${(opt.priceDelta / 100).toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          {!activeMod.required && (
            <TouchableOpacity style={s.skipBtn} onPress={() => { setSelectedOptions((prev) => ({ ...prev, [activeMod.modifierId]: [] })); setCurrentStep((s) => s + 1); }}>
              <Text style={s.skipBtnText}>Skip this step →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, !canAdvance() && s.nextBtnDisabled]} onPress={handleNext} activeOpacity={0.85}>
          <Text style={s.nextBtnText}>{currentStep === totalSteps - 1 ? "Review →" : "Next →"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  progressBar: { flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },
  progressDotDone: { backgroundColor: "#6ee7b7" },
  progressDotActive: { backgroundColor: ACCENT },
  stepHeader: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  stepItemName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  stepCount: { fontSize: 12, color: "#9ca3af" },
  pad: { padding: 16, gap: 12 },
  categoryChip: { alignSelf: "flex-start", backgroundColor: "#eff6ff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryChipText: { color: ACCENT, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  modTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  required: { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  modHint: { fontSize: 12, color: "#9ca3af", marginTop: -6 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  optionSelected: { borderColor: ACCENT, backgroundColor: "#eff6ff" },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  optionRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" },
  optionRadioSelected: { borderColor: ACCENT },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  optionText: { fontSize: 14, color: "#374151", flex: 1 },
  optionTextSelected: { color: "#1d4ed8", fontWeight: "600" },
  optionPrice: { fontSize: 13, fontWeight: "600" },
  optionPriceUp: { color: "#16a34a" },
  optionPriceDown: { color: "#ea580c" },
  defaultChip: { backgroundColor: "#f3f4f6", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  defaultChipText: { fontSize: 10, color: "#6b7280" },
  skipBtn: { alignSelf: "flex-end", paddingVertical: 8, paddingHorizontal: 12 },
  skipBtnText: { color: "#9ca3af", fontSize: 13 },
  heroImg: { width: "100%", height: 220 },
  heroImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 22, fontWeight: "800", color: "#111827" },
  summaryHeading: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  summaryLabel: { fontSize: 13, color: "#6b7280", flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 2, textAlign: "right" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 20, justifyContent: "center", paddingVertical: 8 },
  qtyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 22, fontWeight: "600", color: "#111827" },
  qtyValue: { fontSize: 20, fontWeight: "800", color: "#111827", minWidth: 32, textAlign: "center" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", padding: 16, flexDirection: "row", gap: 10 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  backBtnText: { fontSize: 15, color: "#374151", fontWeight: "600" },
  nextBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 12, padding: 14, alignItems: "center" },
  nextBtnDisabled: { backgroundColor: "#93c5fd" },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  addBtn: { flex: 1, backgroundColor: "#111827", borderRadius: 12, padding: 14, alignItems: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
