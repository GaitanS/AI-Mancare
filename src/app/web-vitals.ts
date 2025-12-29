/**
 * Web Vitals Client-Side Reporting
 * Trimite metrici Core Web Vitals către server
 */

'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to server API
    if (typeof window !== 'undefined') {
      // Log în console (development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Web Vitals]', metric);
      }

      // Send to analytics endpoint (dacă este configurat)
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true') {
        fetch('/api/analytics/web-vitals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metric),
          keepalive: true, // Important pentru metrics trimise la unload
        }).catch((error) => {
          console.error('Failed to send Web Vitals:', error);
        });
      }
    }
  });

  return null;
}
