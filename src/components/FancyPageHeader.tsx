import React from 'react';

interface FancyPageHeaderProps {
    icon?: React.ReactNode;
    badge?: string;
    title: string;
    subtitle?: string;
    stats?: {
        value: string | number;
        label: string;
    }[];
    children?: React.ReactNode;
}

export default function FancyPageHeader({
    icon,
    badge,
    title,
    subtitle,
    stats,
    children
}: FancyPageHeaderProps) {
    return (
        <div className="hidden lg:block relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden mb-8">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
            </div>

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

            <div className="relative container-custom py-10 z-10 px-8">
                <div className="flex items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            {icon && (
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                                    {icon}
                                </div>
                            )}
                            {badge && (
                                <span className="text-white/80 text-xs font-semibold tracking-wide uppercase">{badge}</span>
                            )}
                        </div>
                        <h1 className="font-display text-4xl font-bold text-white mb-2 leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-neutral-400 text-base max-w-lg">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Stats or custom children */}
                    {stats && stats.length > 0 && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-4">
                                {stats.map((stat, index) => (
                                    <React.Fragment key={index}>
                                        {index > 0 && <div className="w-px h-10 bg-white/20" />}
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                                            <div className="text-xs text-white/60">{stat.label}</div>
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
