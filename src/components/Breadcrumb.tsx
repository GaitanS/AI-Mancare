import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

/**
 * Breadcrumb Component
 * Renders visual breadcrumbs with automatic JSON-LD schema injection
 * Use on all pages for consistent navigation and SEO
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

    // Generate JSON-LD schema automatically
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: item.href ? `${baseUrl}${item.href}` : undefined,
        })),
    };

    return (
        <>
            {/* JSON-LD Schema - Auto-injected */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            {/* Visual Breadcrumb */}
            <nav className={`text-sm ${className}`} aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-neutral-400 flex-wrap">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                            {index > 0 && <span>/</span>}
                            {item.href ? (
                                <Link href={item.href} className="hover:text-white transition-colors">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-neutral-300 truncate max-w-[200px]">{item.label}</span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}

/**
 * Light variant for pages with white background
 */
export function BreadcrumbLight({ items, className = '' }: BreadcrumbProps) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://catalogsmart.ro';

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: item.href ? `${baseUrl}${item.href}` : undefined,
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <nav className={`text-sm ${className}`} aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-neutral-500 flex-wrap">
                    {items.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                            {index > 0 && <span>/</span>}
                            {item.href ? (
                                <Link href={item.href} className="hover:text-primary-600 transition-colors">
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-neutral-700 truncate max-w-[200px]">{item.label}</span>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}
