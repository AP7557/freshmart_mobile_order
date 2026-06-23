import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn } from '@/lib/utils';

export function FMLogo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-center gap-2', className)}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require('@/assets/fm-logo.png')}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode='contain'
      />
      <Text
        style={{ fontSize: size * 0.45 }}
        className='font-bold text-fm-dark tracking-tight'
      >
        Freshmart
      </Text>
    </View>
  );
}
