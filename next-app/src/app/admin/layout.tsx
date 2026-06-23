import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { FMLogo } from '@/components/fm-logo';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  ShoppingBag,
  Tag,
  Settings,
  ChefHat,
  LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/items', label: 'Items', icon: ShoppingBag },
  { href: '/admin/modifiers', label: 'Modifiers', icon: Tag },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== 'admin') redirect('/login');

  return (
    <div className='flex min-h-screen bg-muted/30'>
      {/* Sidebar */}
      <aside className='hidden md:flex flex-col w-60 bg-white border-r border-border shrink-0'>
        <div className='p-5 border-b border-border'>
          <FMLogo size={32} />
        </div>
        <nav className='flex-1 p-3 flex flex-col gap-1'>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-fm-pale',
              )}
            >
              <Icon className='w-4 h-4 shrink-0' />
              {label}
            </Link>
          ))}
        </nav>
        <div className='p-3 border-t border-border'>
          <Link
            href='/logout'
            className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors'
          >
            <LogOut className='w-4 h-4' />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className='flex-1 flex flex-col min-w-0'>
        <div className='md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border'>
          <FMLogo size={28} />
        </div>
        <div className='flex-1 p-4 md:p-8'>{children}</div>
      </main>
    </div>
  );
}
