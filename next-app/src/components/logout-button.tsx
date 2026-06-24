'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

// FIX #6: Logout must POST to /api/auth/logout to clear the httpOnly cookie.
// The old sidebar used <Link href="/logout"> which sent GET to a missing page → 404.
export function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  return (
    <button
      onClick={handleLogout}
      className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full'
    >
      <LogOut className='w-4 h-4' />
      Sign out
    </button>
  );
}
