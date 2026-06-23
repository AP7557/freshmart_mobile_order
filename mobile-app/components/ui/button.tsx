import * as React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl active:opacity-80 transition-opacity',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary border border-border',
        outline: 'border border-primary bg-transparent',
        ghost: 'bg-transparent',
        destructive: 'bg-destructive',
        lime: 'bg-fm-lime',
      },
      size: {
        default: 'h-12 px-6 gap-2',
        sm: 'h-9 px-4 gap-1.5',
        lg: 'h-14 px-8 gap-2',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const textVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      outline: 'text-primary',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
      lime: 'text-white',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  variant,
  size,
  onPress,
  disabled,
  loading,
  className,
  textClassName,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        disabled || loading ? 'opacity-50' : '',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size='small'
          color={
            variant === 'outline' || variant === 'ghost' ? '#1a6b3c' : '#fff'
          }
        />
      ) : (
        <Text className={cn(textVariants({ variant, size }), textClassName)}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
