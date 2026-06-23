import '../global.css';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeProvider } from '@react-navigation/native'; // ← correct source
import { NAV_THEME } from '@/lib/theme';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

const queryClient = new QueryClient();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      {/* NAV_THEME.light / NAV_THEME.dark are already full Theme objects */}
      <ThemeProvider value={isDark ? NAV_THEME.dark : NAV_THEME.light}>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
          merchantIdentifier='merchant.com.freshmart.edison'
          urlScheme='freshmart'
        >
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: isDark ? '#0a1f11' : '#ffffff',
              },
              headerTintColor: isDark ? '#7dc242' : '#1a6b3c',
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: {
                backgroundColor: isDark ? '#0a1f11' : '#f0f9ea',
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
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </StripeProvider>
      </ThemeProvider>
      <PortalHost />
    </QueryClientProvider>
  );
}
