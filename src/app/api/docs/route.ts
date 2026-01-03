/**
 * OpenAPI Documentation Endpoint
 * Serves OpenAPI spec and Swagger UI
 */

import { NextRequest, NextResponse } from 'next/server'
import { openApiSpec } from '@/lib/openapi'

/**
 * GET /api/docs
 * Returns OpenAPI specification
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    if (format === 'yaml') {
        // Convert to YAML-like format for readability
        return new NextResponse(JSON.stringify(openApiSpec, null, 2), {
            headers: {
                'Content-Type': 'text/yaml'
            }
        })
    }

    return NextResponse.json(openApiSpec)
}
