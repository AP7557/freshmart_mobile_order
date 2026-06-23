import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "~/lib/useColorScheme";
import { NAV_THEME } from "~/lib/constants";
import { ThemeProvider, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();
  const theme = isDarkColorScheme ? DarkTheme : DefaultTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        value={{
          ...theme,
          colors: {
            ...theme.colors,
            ...NAV_THEME[isDarkColorScheme ? "dark" : "light"],
          },
        }}
      >
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: isDarkColorScheme ? "#0a1f11" : "#ffffff" },
            headerTintColor: isDarkColorScheme ? "#7dc242" : "#1a6b3c",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: isDarkColorScheme ? "#0a1f11" : "#f0f9ea" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="menu" options={{ title: "Menu" }} />
          <Stack.Screen name="item/[id]" options={{ title: "Customize" }} />
          <Stack.Screen name="cart" options={{ title: "Your Cart" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen
            name="order-confirmation/[id]"
            options={{ title: "Order Confirmed", headerBackVisible: false }}
          />
        </Stack>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
