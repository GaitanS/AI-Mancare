/**
 * CDN and Image Optimization Configuration
 * Skill: application-performance → CDN Integration
 * 
 * Provides utilities for CDN URL generation and image optimization
 */

/**
 * CDN Configuration
 * Update these values based on your CDN provider
 */
export const CDN_CONFIG = {
    // Cloudflare
    enabled: process.env.CDN_ENABLED === 'true',
    baseUrl: process.env.CDN_BASE_URL || '',

    // Image optimization
    imageOptimization: {
        enabled: process.env.NEXT_PUBLIC_IMAGE_OPTIMIZATION !== 'false',
        quality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
        formats: ['webp', 'avif'] as const,
        sizes: {
            thumbnail: 150,
            small: 300,
            medium: 600,
            large: 1200,
            full: 1920
        }
    },

    // Cache headers
    cacheControl: {
        static: 'public, max-age=31536000, immutable', // 1 year
        dynamic: 'public, s-maxage=86400, stale-while-revalidate=43200', // 1 day
        api: 'public, s-maxage=300, stale-while-revalidate=600', // 5 min
        noCache: 'no-store, no-cache, must-revalidate'
    }
}

/**
 * Generate optimized image URL
 * Works with Cloudflare Images, imgix, or local Next.js Image Optimization
 */
export function getOptimizedImageUrl(
    src: string,
    options: {
        width?: number
        height?: number
        quality?: number
        format?: 'webp' | 'avif' | 'auto'
    } = {}
): string {
    if (!src) return '/images/placeholder.jpg'

    // If CDN is disabled or URL is already optimized, return as-is
    if (!CDN_CONFIG.enabled || src.includes('/_next/image')) {
        return src
    }

    // External URLs - use Next.js Image Optimization
    if (src.startsWith('http://') || src.startsWith('https://')) {
        const params = new URLSearchParams()
        params.set('url', src)
        if (options.width) params.set('w', String(options.width))
        params.set('q', String(options.quality || CDN_CONFIG.imageOptimization.quality))
        return `/_next/image?${params.toString()}`
    }

    // Cloudflare Images format
    if (CDN_CONFIG.baseUrl.includes('cloudflare')) {
        const cfParams = [
            options.width && `width=${options.width}`,
            options.height && `height=${options.height}`,
            `quality=${options.quality || CDN_CONFIG.imageOptimization.quality}`,
            options.format && `format=${options.format}`
        ].filter(Boolean).join(',')

        return `${CDN_CONFIG.baseUrl}/cdn-cgi/image/${cfParams}${src}`
    }

    // imgix format
    if (CDN_CONFIG.baseUrl.includes('imgix')) {
        const imgixParams = new URLSearchParams()
        if (options.width) imgixParams.set('w', String(options.width))
        if (options.height) imgixParams.set('h', String(options.height))
        imgixParams.set('q', String(options.quality || CDN_CONFIG.imageOptimization.quality))
        imgixParams.set('auto', 'format,compress')

        return `${CDN_CONFIG.baseUrl}${src}?${imgixParams.toString()}`
    }

    // Default: use CDN base URL
    return `${CDN_CONFIG.baseUrl}${src}`
}

/**
 * Get responsive image srcSet for different screen sizes
 */
export function getImageSrcSet(
    src: string,
    sizes: number[] = [300, 600, 1200]
): string {
    return sizes
        .map(width => `${getOptimizedImageUrl(src, { width })} ${width}w`)
        .join(', ')
}

/**
 * Generate blur placeholder data URL
 */
export function getBlurDataUrl(width = 10, height = 10): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="1"/>
      </filter>
      <rect preserveAspectRatio="none" filter="url(#b)" x="0" y="0" height="100%" width="100%" fill="#f5f5f5"/>
    </svg>`
    )}`
}

/**
 * Image loader for Next.js Image component with CDN support
 */
export const cdnImageLoader = ({
    src,
    width,
    quality
}: {
    src: string
    width: number
    quality?: number
}): string => {
    return getOptimizedImageUrl(src, { width, quality })
}

/**
 * Static asset URL with CDN
 */
export function getStaticAssetUrl(path: string): string {
    if (!CDN_CONFIG.enabled) return path
    return `${CDN_CONFIG.baseUrl}${path}`
}

/**
 * Get appropriate cache control header
 */
export function getCacheControlHeader(
    type: 'static' | 'dynamic' | 'api' | 'noCache' = 'dynamic'
): string {
    return CDN_CONFIG.cacheControl[type]
}

/**
 * Preload critical images
 * Returns link tags for preloading
 */
export function getPreloadLinks(imageSrcs: string[]): string[] {
    return imageSrcs.map(src =>
        `<link rel="preload" as="image" href="${getOptimizedImageUrl(src, { width: 1200 })}" />`
    )
}

/**
 * Check if image should be lazy loaded
 */
export function shouldLazyLoad(priority: boolean, index: number): boolean {
    // First 3 images are loaded eagerly
    return !priority && index >= 3
}
