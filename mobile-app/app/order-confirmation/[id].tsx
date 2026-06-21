import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface OrderDetails {
  id: number;
  customerName: string;
  customerPhone: string;
  status: string;
  estimatedReadyAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  lines: Array<{ id: number; itemName: string; quantity: number; lineTotal: number; modifiers: string[] }>;
}

const STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  paid: "✅",
  preparing: "👨‍🍳",
  ready: "🔔",
  completed: "🎉",
  cancelled: "❌",
};

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useQuery<OrderDetails>({
    queryKey: ["order", id],
    queryFn: () => apiFetch(`/api/orders/${id}`),
    refetchInterval: 30_000,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (!data) return <View style={styles.center}><Text>Order not found.</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>{STATUS_ICON[data.status] ?? "📋"}</Text>
        <Text style={styles.heroTitle}>Order #{data.id}</Text>
        <Text style={styles.heroStatus}>{data.status.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Name" value={data.customerName} />
        <Row label="Phone" value={data.customerPhone} />
        <Row label="Ready by" value={new Date(data.estimatedReadyAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
      </View>

      <Text style={styles.sectionTitle}>Items</Text>
      <View style={styles.card}>
        {data.lines.map((line) => (
          <View key={line.id} style={styles.lineItem}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineName}>{line.quantity}× {line.itemName}</Text>
              <Text style={styles.linePrice}>${(line.lineTotal / 100).toFixed(2)}</Text>
            </View>
            {line.modifiers?.map((m, i) => (
              <Text key={i} style={styles.lineMod}>+ {m}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Row label="Subtotal" value={`$${(data.subtotal / 100).toFixed(2)}`} />
        {data.discountTotal > 0 && <Row label="Discount" value={`-$${(data.discountTotal / 100).toFixed(2)}`} color="#16a34a" />}
        <Row label="Tax" value={`$${(data.taxTotal / 100).toFixed(2)}`} />
        <Row label="Total Charged" value={`$${(data.total / 100).toFixed(2)}`} bold />
      </View>
    </ScrollView>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 24, gap: 6 },
  heroIcon: { fontSize: 52 },
  heroTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  heroStatus: { fontSize: 14, fontWeight: "600", color: "#6b7280", letterSpacing: 1 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 10, elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  lineItem: { gap: 2 },
  lineHeader: { flexDirection: "row", justifyContent: "space-between" },
  lineName: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
  linePrice: { fontSize: 14, fontWeight: "600", color: "#111827" },
  lineMod: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 14, color: "#6b7280" },
  rowValue: { fontSize: 14, color: "#111827" },
  rowValueBold: { fontWeight: "700", fontSize: 15 },
});
