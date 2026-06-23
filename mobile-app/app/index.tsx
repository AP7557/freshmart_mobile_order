import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '~/lib/api';
import { FMLogo } from '~/components/fm-logo';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import type { MenuData, Promotion } from '~/types';
import { SafeAreaView } from 'react-native-safe-area-context';

function PromoBanner({ promo }: { promo: Promotion }) {
  return (
    <Card className='mr-4 w-72 bg-fm-dark border-0'>
      <CardContent className='p-4'>
        <Badge variant='lime' className='mb-2 self-start'>
          DEAL
        </Badge>
        <Text className='text-white text-lg font-bold leading-tight mb-1'>
          {promo.name}
        </Text>
        <Text className='text-fm-light text-sm'>{promo.description}</Text>
      </CardContent>
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery<MenuData>({
    queryKey: ['menu'],
    queryFn: () => apiFetch('/api/menu'),
    staleTime: 30_000,
  });

  const promos = (data?.promotions ?? []).filter((p) => p.isActive);

  return (
    <SafeAreaView className='flex-1 bg-fm-pale'>
      <ScrollView className='flex-1' showsVerticalScrollIndicator={false}>
        {/* Hero header */}
        <View className='bg-fm-dark px-6 pt-8 pb-10'>
          <FMLogo size={40} className='mb-6 [&_span]:text-white' />
          <Text className='text-white text-3xl font-bold leading-tight'>
            Fresh. Fast.{''}Delivered.
          </Text>
          <Text className='text-fm-light mt-2 text-base'>
            Order from Freshmart Edison
          </Text>
        </View>

        {/* Promotions */}
        {promos.length > 0 && (
          <View className='mt-6'>
            <Text className='px-5 text-lg font-bold text-foreground mb-3'>
              Today's Deals
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {isLoading
                ? [1, 2].map((i) => (
                    <View
                      key={i}
                      className='mr-4 w-72 h-28 bg-muted rounded-2xl'
                    />
                  ))
                : promos.map((p) => <PromoBanner key={p.id} promo={p} />)}
            </ScrollView>
          </View>
        )}

        {/* Featured items grid */}
        <View className='px-5 mt-8'>
          <Text className='text-lg font-bold text-foreground mb-3'>
            Popular Items
          </Text>
          {isLoading ? (
            <ActivityIndicator color='#1a6b3c' />
          ) : (
            <View className='flex-row flex-wrap gap-4'>
              {(data?.items ?? [])
                .filter((i) => i.isActive)
                .slice(0, 6)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/item/${item.id}`)}
                    className='active:opacity-70 flex-1 min-w-[44%]'
                  >
                    <Card>
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          className='w-full h-32 rounded-t-2xl'
                          resizeMode='cover'
                        />
                      ) : (
                        <View className='w-full h-32 bg-fm-pale items-center justify-center'>
                          <Text className='text-4xl'>🥗</Text>
                        </View>
                      )}
                      <CardContent className='p-3'>
                        <Text
                          className='font-semibold text-foreground text-sm'
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text className='text-fm-dark font-bold text-sm mt-0.5'>
                          ${(item.basePrice / 100).toFixed(2)}
                        </Text>
                      </CardContent>
                    </Card>
                  </Pressable>
                ))}
            </View>
          )}
        </View>

        {/* CTA */}
        <View className='px-5 mt-8 mb-10'>
          <Button
            size='lg'
            onPress={() => router.push('/menu')}
            className='bg-fm-dark w-full'
          >
            View Full Menu →
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
