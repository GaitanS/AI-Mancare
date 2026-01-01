'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Bottom Navigation for Mobile-First Experience (Cherrypick Style)
const navItems = [
    {
        name: 'Acasa',
        href: '/',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-primary-600" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        name: 'Plan',
        href: '/plan',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-primary-600" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        name: 'Shop',
        href: '/cart',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-red-500" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    {
        name: 'Oferte',
        href: '/cataloage',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-primary-600" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
        ),
    },
    {
        name: 'Rețete',
        href: '/retete',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-primary-600" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        ),
    },
    {
        name: 'Profil',
        href: '/profile',
        icon: (active: boolean) => (
            <svg className={cn("w-6 h-6", active ? "text-primary-600" : "text-neutral-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-lg lg:hidden">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors",
                                isActive ? "text-primary-600" : "text-neutral-500 hover:text-neutral-700"
                            )}
                        >
                            {item.icon(isActive)}
                            <span className={cn(
                                "text-[10px] font-semibold",
                                isActive ? "text-primary-600" : "text-neutral-500"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Safe area spacer for iOS */}
            <div className="h-safe-bottom bg-white" />
        </nav>
    );
}
