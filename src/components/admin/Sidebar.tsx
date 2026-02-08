'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊', description: 'Overview & Stats' },
  { href: '/admin/processes', label: 'Processes', icon: '⚙️', description: 'Manage Scrapers' },
  { href: '/admin/queue', label: 'Queue', icon: '📋', description: 'Running & History' },
  { href: '/admin/stores', label: 'Stores', icon: '🏪', description: 'Store Config' },
  { href: '/admin/products', label: 'Products', icon: '📦', description: 'Manage Products' },
  { href: '/admin/recipes', label: 'Recipes', icon: '🍳', description: 'Edit Recipes' },
  { href: '/admin/catalogs', label: 'Catalogs', icon: '📚', description: 'Catalog Archive' },
  { href: '/admin/articles', label: 'Articles', icon: '✍️', description: 'Blog Management' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈', description: 'User Engagement' },
  { href: '/admin/audit', label: 'Audit Log', icon: '📜', description: 'Action History' },
  { href: '/admin/logs', label: 'Logs', icon: '📝', description: 'System Logs' },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside className="w-72 lg:w-64 bg-neutral-900 border-r border-white/5 flex flex-col h-screen lg:sticky lg:top-0">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-white/5 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
            <span className="text-lg lg:text-xl">🍳</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm lg:text-base">CatalogSmart</h1>
            <p className="text-[10px] lg:text-xs text-neutral-500">Admin Panel</p>
          </div>
        </Link>

        {/* Close button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all group ${
              isActive(item.href)
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-lg lg:text-xl">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="block font-medium text-sm">{item.label}</span>
              {item.description && (
                <span className="hidden lg:block text-xs text-neutral-500 truncate">
                  {item.description}
                </span>
              )}
            </div>
            {isActive(item.href) && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            )}
          </Link>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="p-3 lg:p-4 border-t border-white/5">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 lg:px-4 py-2 text-neutral-500 hover:text-white text-sm transition-colors"
        >
          <span>🌐</span>
          <span>View Site</span>
          <span className="ml-auto text-xs">↗</span>
        </Link>
      </div>

      {/* User / Logout */}
      <div className="p-3 lg:p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          <span>🚪</span>
          <span className="font-medium text-sm">
            {loggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>
    </aside>
  );
}
