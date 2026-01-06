'use client';

import { useEffect } from 'react';

export default function TestErrorPage() {
    useEffect(() => {
        // This will throw an error after the page mounts
        throw new Error('Test error to verify custom error page');
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Loading error test...</p>
        </div>
    );
}
