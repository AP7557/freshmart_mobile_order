import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "~/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={cn("bg-card rounded-2xl border border-border shadow-sm overflow-hidden", className)}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("p-4 pb-2", className)}>{children}</View>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn("text-lg font-bold text-foreground", className)}>{children}</Text>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={cn("p-4 pt-2", className)}>{children}</View>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={cn("flex-row items-center p-4 pt-2 border-t border-border", className)}>
      {children}
    </View>
  );
}
