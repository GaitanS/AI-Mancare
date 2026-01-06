'use client';

import Link from 'next/link';
import Image from 'next/image';

interface ArticleCardProps {
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    coverImage?: string | null;
    publishedAt: Date;
    readingTime?: number | null;
    author?: string;
}

const categoryColors: Record<string, string> = {
    tips: 'bg-blue-100 text-blue-700',
    economie: 'bg-green-100 text-green-700',
    retete: 'bg-orange-100 text-orange-700',
    ghiduri: 'bg-purple-100 text-purple-700',
};

const categoryLabels: Record<string, string> = {
    tips: 'Tips & Trucuri',
    economie: 'Economie',
    retete: 'Rețete',
    ghiduri: 'Ghiduri',
};

export function ArticleCard({
    title,
    slug,
    excerpt,
    category,
    coverImage,
    publishedAt,
    readingTime,
    author = 'CatalogSmart',
}: ArticleCardProps) {
    const formattedDate = new Date(publishedAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <article className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-neutral-100">
            {/* Cover Image */}
            <Link href={`/blog/${slug}`} className="block aspect-[16/9] relative overflow-hidden">
                {coverImage ? (
                    <Image
                        src={coverImage}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                        <svg className="w-16 h-16 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                )}
            </Link>

            {/* Content */}
            <div className="p-5">
                {/* Category Badge */}
                <div className="mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[category] || 'bg-neutral-100 text-neutral-700'}`}>
                        {categoryLabels[category] || category}
                    </span>
                </div>

                {/* Title */}
                <Link href={`/blog/${slug}`}>
                    <h2 className="font-display text-xl font-bold text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {title}
                    </h2>
                </Link>

                {/* Excerpt */}
                <p className="text-neutral-600 text-sm leading-relaxed mb-4 line-clamp-3">
                    {excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-100">
                    <div className="flex items-center gap-2">
                        <span>{author}</span>
                        <span>•</span>
                        <time dateTime={publishedAt.toISOString()}>{formattedDate}</time>
                    </div>
                    {readingTime && (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {readingTime} min citire
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}
