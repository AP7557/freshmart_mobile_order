import { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import { Item, MenuData } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

async function fetchMenu(): Promise<MenuData> {
  const res = await apiFetch<{ data: MenuData }>('/api/menu');
  return res.data;
}

export default function MenuScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery<MenuData>({
    queryKey: ['menu'],
    queryFn: fetchMenu,
    staleTime: 30_000,
  });

  const items: Item[] = useMemo(() => {
    const all = data?.items.filter((i) => i.isActive) ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }, [data?.items, search]);

  return (
    <SafeAreaView className='flex-1 bg-background' edges={['top']}>
      <Input
        placeholder='Search menu…'
        value={search}
        onChangeText={setSearch}
        className='mx-5 my-3'
        clearButtonMode='while-editing'
        returnKeyType='search'
      />

      {isLoading && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-muted-foreground'>Loading menu…</Text>
        </View>
      )}

      {isError && (
        <View className='flex-1 items-center justify-center px-6'>
          <Text className='text-destructive text-center'>
            Failed to load menu. Pull down to retry.
          </Text>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View className='flex-1 items-center justify-center px-6'>
          <Text className='text-muted-foreground text-center'>
            No items match &ldquo;{search}&rdquo;
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName='px-5 pb-8 gap-3'
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/item/${item.id}`)}
            className='active:opacity-70'
            accessibilityRole='button'
            accessibilityLabel={`View ${item.name}`}
          >
            <Card>
              <CardContent className='p-0 flex-row overflow-hidden'>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 96, height: 96 }}
                    resizeMode='cover'
                  />
                ) : (
                  <View className='w-24 h-24 bg-muted items-center justify-center'>
                    <Text className='text-2xl'>🍽</Text>
                  </View>
                )}
                <View className='flex-1 p-3 justify-center gap-1'>
                  <Text
                    className='text-base font-semibold text-foreground'
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      className='text-xs text-muted-foreground'
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                  <Text className='text-sm font-bold text-primary'>
                    ${(item.basePrice / 100).toFixed(2)}
                  </Text>
                </View>
                {!item.isActive && (
                  <Badge variant='secondary' className='absolute top-2 right-2'>
                    Unavailable
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
