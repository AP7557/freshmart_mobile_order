import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
interface OrderLine {
  id: number;
  itemName: string;
  quantity: number;
  lineTotal: number;
  modifiers: string[] | null;
}
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
  lines: OrderLine[];
}
const STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  paid: '✅',
  preparing: '👨‍🍳',
  ready: '🔔',
  completed: '🎉',
  cancelled: '❌',
};
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  completed: '#059669',
  cancelled: '#ef4444',
};
function fmt(c: number) {
  return `$${(c / 100).toFixed(2)}`;
}
function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useQuery<OrderDetails>({
    queryKey: ['order', id],
    queryFn: () => apiFetch(`/api/orders/${id}`),
    refetchInterval: 30_000,
    enabled: !!id,
  });
  if (isLoading)
    return (
      <View style={s.center}>
        <ActivityIndicator size='large' color='#3b82f6' />
      </View>
    );
  if (isError || !data)
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text style={s.errText}>Could not load order</Text>
        <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')}>
          <Text style={s.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  const statusColor = STATUS_COLOR[data.status] ?? '#6b7280';
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.scroll}>
      <View style={s.hero}>
        <Text style={s.heroIcon}>{STATUS_ICON[data.status] ?? '📋'}</Text>
        <Text style={s.heroTitle}>Order #{data.id}</Text>
        <View style={[s.badge, { backgroundColor: statusColor }]}>
          <Text style={s.badgeText}>{data.status.toUpperCase()}</Text>
        </View>
        <Text style={s.heroSub}>
          Ready by ~{fmtTime(data.estimatedReadyAt)}
        </Text>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Customer</Text>
        <Row label='Name' value={data.customerName} />
        <Row label='Phone' value={data.customerPhone} />
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Items</Text>
        {(data.lines ?? []).map((line) => (
          <View key={line.id} style={s.lineItem}>
            <View style={s.lineTop}>
              <Text style={s.lineQty}>{line.quantity}×</Text>
              <Text style={s.lineName}>{line.itemName}</Text>
              <Text style={s.linePrice}>{fmt(line.lineTotal)}</Text>
            </View>
            {(line.modifiers ?? []).length > 0 && (
              <View style={s.lineMods}>
                {(line.modifiers ?? []).map((m, i) => (
                  <Text key={i} style={s.lineMod}>
                    ✓ {m}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Pricing</Text>
        <Row label='Subtotal' value={fmt(data.subtotal)} />
        {data.discountTotal > 0 && (
          <Row
            label='Discount'
            value={`-${fmt(data.discountTotal)}`}
            valueColor='#059669'
          />
        )}
        <Row label='Tax' value={fmt(data.taxTotal)} />
        <View style={s.divider} />
        <Row label='Total' value={fmt(data.total)} bold />
      </View>
      <View style={s.refreshNote}>
        <Text style={s.refreshText}>
          🔄 Auto-refreshes every 30s to show order status.
        </Text>
      </View>
      <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')}>
        <Text style={s.homeBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
function Row({
  label,
  value,
  bold = false,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={r.row}>
      <Text style={r.label}>{label}</Text>
      <Text
        style={[
          r.value,
          bold && r.valueBold,
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
const r = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: { fontSize: 13, color: '#6b7280' },
  value: { fontSize: 13, color: '#111827' },
  valueBold: { fontWeight: '800', fontSize: 15 },
});
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errText: { fontSize: 16, color: '#6b7280' },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  badge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  heroSub: { fontSize: 13, color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  lineItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineQty: { fontSize: 13, color: '#9ca3af', width: 26 },
  lineName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  linePrice: { fontSize: 13, color: '#374151' },
  lineMods: { marginLeft: 26, marginTop: 3, gap: 2 },
  lineMod: { fontSize: 12, color: '#6b7280' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  refreshNote: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 12 },
  refreshText: { fontSize: 12, color: '#3b82f6', lineHeight: 18 },
  homeBtn: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
