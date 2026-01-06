'use client';

/**
 * SchemaScript Component
 * Renders JSON-LD structured data in the page head
 * Used for dynamic SEO schema injection from AI-populated content
 */

interface SchemaScriptProps {
    schema: object | object[];
}

/**
 * Renders one or more JSON-LD schema objects
 * Usage: <SchemaScript schema={generateRecipeSchema(recipe)} />
 * Or for multiple: <SchemaScript schema={[schema1, schema2]} />
 */
export function SchemaScript({ schema }: SchemaScriptProps) {
    const schemas = Array.isArray(schema) ? schema : [schema];

    return (
        <>
            {schemas.map((s, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
                />
            ))}
        </>
    );
}

/**
 * Server-side version for use in generateMetadata or page components
 * Returns the raw script tag HTML string
 */
export function getSchemaScriptHtml(schema: object | object[]): string {
    const schemas = Array.isArray(schema) ? schema : [schema];
    return schemas
        .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
        .join('\n');
}
