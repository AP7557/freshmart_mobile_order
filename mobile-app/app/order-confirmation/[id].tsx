import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  paid: '✅',
  preparing: '👨‍🍳',
  ready: '🔔',
  completed: '🎉',
  cancelled: '❌',
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
      <SafeAreaView className='flex-1 bg-background items-center justify-center'>
        <ActivityIndicator size='large' />
      </SafeAreaView>
    );
  if (isError || !data)
    return (
      <SafeAreaView className='flex-1 bg-background items-center justify-center px-6 gap-4'>
        <Text className='text-5xl'>⚠️</Text>
        <Text className='text-base text-muted-foreground'>
          Could not load order
        </Text>
        <Button onPress={() => router.replace('/')}>
          <Text>Back to Home</Text>
        </Button>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['bottom']}>
      <ScrollView
        className='flex-1'
        contentContainerClassName='p-4 gap-3 pb-10'
      >
        <View className='bg-foreground rounded-2xl p-7 items-center gap-3'>
          <Text className='text-5xl'>{STATUS_ICON[data.status] ?? '📋'}</Text>
          <Text className='text-2xl font-extrabold text-background'>
            Order #{data.id}
          </Text>
          <Badge variant={data.status === 'ready' ? 'default' : 'secondary'}>
            {data.status.toUpperCase()}
          </Badge>
          <Text className='text-sm text-muted-foreground'>
            Ready by ~{fmtTime(data.estimatedReadyAt)}
          </Text>
        </View>

        <Card>
          <CardContent className='p-4 gap-2'>
            <Text className='text-sm font-bold text-foreground mb-1'>
              Customer
            </Text>
            <Row label='Name' value={data.customerName} />
            <Row label='Phone' value={data.customerPhone} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4 gap-2'>
            <Text className='text-sm font-bold text-foreground mb-1'>
              Items
            </Text>
            {(data.lines ?? []).map((line) => (
              <View key={line.id} className='gap-0.5'>
                <View className='flex-row items-center gap-1.5'>
                  <Text className='text-xs text-muted-foreground w-6'>
                    {line.quantity}×
                  </Text>
                  <Text className='flex-1 text-sm font-semibold text-foreground'>
                    {line.itemName}
                  </Text>
                  <Text className='text-xs'>{fmt(line.lineTotal)}</Text>
                </View>
                {(line.modifiers ?? []).map((m, i) => (
                  <Text key={i} className='text-xs text-muted-foreground ml-8'>
                    + {m}
                  </Text>
                ))}
              </View>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4 gap-2'>
            <Text className='text-sm font-bold text-foreground mb-1'>
              Pricing
            </Text>
            <Row label='Subtotal' value={fmt(data.subtotal)} />
            {data.discountTotal > 0 && (
              <Row label='Discount' value={`-${fmt(data.discountTotal)}`} />
            )}
            <Row label='Tax' value={fmt(data.taxTotal)} />
            <View className='h-px bg-border my-1' />
            <Row label='Total' value={fmt(data.total)} bold />
          </CardContent>
        </Card>

        <View className='bg-blue-50 dark:bg-blue-950 rounded-xl p-3'>
          <Text className='text-xs text-blue-600 dark:text-blue-400 text-center'>
            🔄 Auto-refreshes every 30s.
          </Text>
        </View>
        <Button size='lg' onPress={() => router.replace('/')}>
          <Text>Back to Home</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View className='flex-row justify-between py-0.5'>
      <Text className='text-sm text-muted-foreground'>{label}</Text>
      <Text
        className={`text-sm text-foreground ${bold ? 'font-extrabold text-base' : ''}`}
      >
        {value}
      </Text>
    </View>
  );
}
