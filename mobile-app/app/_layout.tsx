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
      <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.com.yourcompany.freshmartorder">
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: "#ffffff" }, headerTintColor: "#111827", headerShadowVisible: false, contentStyle: { backgroundColor: "#f9fafb" } }}>
          <Stack.Screen name="index"                   options={{ title: "Today's Deals" }} />
          <Stack.Screen name="menu"                    options={{ title: "Menu" }} />
          <Stack.Screen name="item/[id]"               options={{ title: "Customize" }} />
          <Stack.Screen name="cart"                    options={{ title: "Your Cart" }} />
          <Stack.Screen name="checkout"                options={{ title: "Checkout" }} />
          <Stack.Screen name="order-confirmation/[id]" options={{ title: "Order Confirmed", headerBackVisible: false }} />
        </Stack>
      </StripeProvider>
    </QueryClientProvider>
  );
}
