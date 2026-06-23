import * as React from 'react';
import { TextInput, View, Text, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className='gap-1.5'>
      {label && (
        <Text className='text-sm font-medium text-foreground'>{label}</Text>
      )}
      <TextInput
        className={cn(
          'h-12 rounded-xl border border-input bg-background px-4 text-base text-foreground',
          'placeholder:text-muted-foreground',
          'focus:border-ring',
          error ? 'border-destructive' : '',
          className,
        )}
        placeholderTextColor='#6b7280'
        {...props}
      />
      {error && <Text className='text-xs text-destructive'>{error}</Text>}
    </View>
  );
}
