import * as React from "react";
import { View, Text } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default:     "bg-primary border-transparent",
        secondary:   "bg-secondary border-transparent",
        outline:     "border-border bg-transparent",
        destructive: "bg-destructive border-transparent",
        lime:        "bg-fm-lime border-transparent",
        paid:        "bg-yellow-100 border-yellow-300",
        preparing:   "bg-blue-100 border-blue-300",
        ready:       "bg-green-100 border-green-300",
        completed:   "bg-gray-100 border-gray-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const badgeTextVariants = cva("text-xs font-semibold", {
  variants: {
    variant: {
      default:     "text-primary-foreground",
      secondary:   "text-secondary-foreground",
      outline:     "text-foreground",
      destructive: "text-destructive-foreground",
      lime:        "text-white",
      paid:        "text-yellow-800",
      preparing:   "text-blue-800",
      ready:       "text-green-800",
      completed:   "text-gray-600",
    },
  },
  defaultVariants: { variant: "default" },
});

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className={cn(badgeTextVariants({ variant }))}>{children}</Text>
    </View>
  );
}
