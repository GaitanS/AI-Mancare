/**
 * Swagger UI Page
 * Interactive API documentation
 */

'use client'

import { useEffect, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function DocsPage() {
    const [spec, setSpec] = useState(null)

    useEffect(() => {
        fetch('/api/docs')
            .then(res => res.json())
            .then(setSpec)
    }, [])

    if (!spec) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <SwaggerUI spec={spec} />
        </div>
    )
}
