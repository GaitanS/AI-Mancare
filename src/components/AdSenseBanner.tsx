'use client';

import React, { useEffect } from 'react';

// Declare standard Google AdSense types
declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface AdSenseBannerProps {
    slotId?: string;
    format?: 'auto' | 'fluid' | 'rectangle';
    className?: string;
    style?: React.CSSProperties;
    layout?: 'in-article' | 'display';
}

export default function AdSenseBanner({
    slotId = "8962383842", // Example placeholder slot ID
    format = 'auto',
    className = "",
    style = { display: 'block' },
    layout = 'display'
}: AdSenseBannerProps) {
    const adRef = React.useRef<HTMLModElement>(null);

    useEffect(() => {
        // Prevent duplicate injection if ad is already loaded in this slot
        if (adRef.current && adRef.current.innerHTML.length === 0) {
            try {
                // Check if the container has a valid width before initializing
                const containerWidth = adRef.current.clientWidth;
                if (containerWidth > 0) {
                    // Push definition to Google's stack
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                }
            } catch (err) {
                console.error('AdSense error:', err);
            }
        }
    }, []);

    // Placeholder visualization for development (when no AdSense loaded)
    // In production, this div gets populated by the script
    return (
        <div className={`relative overflow-hidden min-h-[60px] bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200 ${className}`}>
            {/* Real Client ID from logs: ca-pub-4509784482094331 */}
            <ins ref={adRef} className="adsbygoogle w-full block"
                style={style}
                data-ad-client="ca-pub-4509784482094331"
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive="false"></ins>

            {/* Dev Label - hidden if ad loads (AdSense usually wipes content or adds iframe, but strict absolute positioning might overlay it. 
                 Ideally we hide this if ad loads, but AdSense doesn't give a clean callback. Keeping it as a 'background' label) */}
            <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-[10px] uppercase tracking-wider font-semibold pointer-events-none -z-10">
                Reclamă
            </div>
        </div>
    );
}
