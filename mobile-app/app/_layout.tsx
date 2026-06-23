import '../global.css';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '../lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Suppress Reanimated strict-mode render warnings (Expo Router internal)
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      {/* StripeProvider must wrap everything that uses @stripe/stripe-react-native hooks */}
      <StripeProvider
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
        merchantIdentifier='merchant.com.freshmart.edison'
        urlScheme='freshmart'
      >
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDarkColorScheme ? '#0a1f11' : '#ffffff',
            },
            headerTintColor: isDarkColorScheme ? '#7dc242' : '#1a6b3c',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: {
              backgroundColor: isDarkColorScheme ? '#0a1f11' : '#f0f9ea',
            },
          }}
        >
          <Stack.Screen name='index' options={{ headerShown: false }} />
          <Stack.Screen name='menu' options={{ title: 'Menu' }} />
          <Stack.Screen name='item/[id]' options={{ title: 'Customize' }} />
          <Stack.Screen name='cart' options={{ title: 'Your Cart' }} />
          <Stack.Screen name='checkout' options={{ title: 'Checkout' }} />
          <Stack.Screen
            name='order-confirmation/[id]'
            options={{ title: 'Order Confirmed', headerBackVisible: false }}
          />
        </Stack>
        <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
      </StripeProvider>
    </QueryClientProvider>
  );
}
