'use client';

import React, { useEffect } from 'react';

// Declare standard Google AdSense types
declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

// Ad size configurations to prevent CLS (Cumulative Layout Shift)
const adSizeConfig = {
    'banner': { mobile: 'min-h-[100px]', desktop: 'lg:min-h-[90px]' },        // 320x100 mobile, 728x90 desktop
    'rectangle': { mobile: 'min-h-[250px]', desktop: 'lg:min-h-[250px]' },    // 300x250
    'large-rectangle': { mobile: 'min-h-[280px]', desktop: 'lg:min-h-[280px]' }, // 336x280
    'leaderboard': { mobile: 'min-h-[100px]', desktop: 'lg:min-h-[90px]' },   // 728x90
    'in-feed': { mobile: 'min-h-[120px]', desktop: 'lg:min-h-[120px]' },      // Native in-feed
} as const;

type AdSize = keyof typeof adSizeConfig;

interface AdSenseBannerProps {
    slotId?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    className?: string;
    style?: React.CSSProperties;
    layout?: 'in-article' | 'display';
    size?: AdSize; // New prop for explicit sizing
}

export default function AdSenseBanner({
    slotId = "8962383842", // Example placeholder slot ID
    format = 'auto',
    className = "",
    style = { display: 'block' },
    layout = 'display',
    size = 'rectangle' // Default to rectangle for best CLS prevention
}: AdSenseBannerProps) {
    const adRef = React.useRef<HTMLModElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = React.useState(false);

    useEffect(() => {
        // Use IntersectionObserver to only load ads when visible
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isLoaded && adRef.current) {
                        const containerWidth = adRef.current.clientWidth;
                        // Only push if container has valid width (visible)
                        if (containerWidth > 0) {
                            try {
                                (window.adsbygoogle = window.adsbygoogle || []).push({});
                                setIsLoaded(true);
                            } catch (err) {
                                // Silently ignore AdSense errors in dev
                                if (process.env.NODE_ENV === 'production') {
                                    console.error('AdSense error:', err);
                                }
                            }
                        }
                    }
                });
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [isLoaded]);

    // Get size classes based on the size prop
    const sizeClasses = adSizeConfig[size];
    const heightClasses = `${sizeClasses.mobile} ${sizeClasses.desktop}`;

    // Placeholder visualization for development (when no AdSense loaded)
    // In production, this div gets populated by the script
    return (
        <div ref={containerRef} className={`relative overflow-hidden ${heightClasses} bg-neutral-100 rounded-xl flex items-center justify-center border border-neutral-200/60 ${className}`}>
            {/* Real Client ID from logs: ca-pub-4509784482094331 */}
            <ins ref={adRef} className="adsbygoogle w-full block"
                style={style}
                data-ad-client="ca-pub-4509784482094331"
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="false"></ins>

            {/* Dev Label - hidden if ad loads (AdSense usually wipes content or adds iframe, but strict absolute positioning might overlay it.
                 Ideally we hide this if ad loads, but AdSense doesn't give a clean callback. Keeping it as a 'background' label) */}
            <div className="absolute inset-0 flex items-center justify-center text-neutral-300 text-[10px] uppercase tracking-wider font-semibold pointer-events-none z-0">
                Reclamă
            </div>
        </div>
    );
}
