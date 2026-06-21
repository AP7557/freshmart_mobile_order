import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.com.yourcompany.ordering">
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#111827",
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Today's Specials" }} />
          <Stack.Screen name="menu" options={{ title: "Menu" }} />
          <Stack.Screen name="item/[id]" options={{ title: "Item" }} />
          <Stack.Screen name="cart" options={{ title: "Cart" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="order-confirmation/[id]" options={{ title: "Order Confirmed" }} />
        </Stack>
      </StripeProvider>
    </QueryClientProvider>
  );
}
