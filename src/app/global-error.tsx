'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global error:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                        {/* Error Icon */}
                        <div style={{
                            width: '128px',
                            height: '128px',
                            margin: '0 auto 32px',
                            background: '#fee2e2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        {/* Error Code */}
                        <h1 style={{ fontSize: '72px', fontWeight: 'bold', color: '#171717', margin: '0 0 8px' }}>
                            Oops!
                        </h1>

                        {/* Title */}
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#262626', margin: '0 0 16px' }}>
                            Eroare de sistem
                        </h2>

                        {/* Description */}
                        <p style={{ color: '#525252', marginBottom: '32px' }}>
                            A apărut o eroare critică. Te rugăm să reîncarci pagina sau să revii mai târziu.
                        </p>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                onClick={() => reset()}
                                style={{
                                    padding: '12px 24px',
                                    background: '#ea580c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                Încearcă din nou
                            </button>

                            <a
                                href="/"
                                style={{
                                    padding: '12px 24px',
                                    background: 'white',
                                    color: '#404040',
                                    border: '1px solid #d4d4d4',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    textDecoration: 'none',
                                    fontSize: '16px'
                                }}
                            >
                                Înapoi acasă
                            </a>
                        </div>

                        {/* Error ID */}
                        {error.digest && (
                            <p style={{ marginTop: '32px', fontSize: '12px', color: '#a3a3a3' }}>
                                ID Eroare: {error.digest}
                            </p>
                        )}
                    </div>
                </div>
            </body>
        </html>
    );
}
