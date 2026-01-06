import Link from 'next/link';

interface RelatedArticle {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
}

interface RelatedArticlesProps {
    currentSlug: string;
    currentCategory: string;
    articles: Record<string, { title: string; excerpt: string; category: string }>;
}

/**
 * RelatedArticles Component
 * Automatically shows related articles based on category
 * Used at the bottom of blog article pages
 */
export default function RelatedArticles({ currentSlug, currentCategory, articles }: RelatedArticlesProps) {
    // Get related articles (same category, different slug)
    const relatedArticles: RelatedArticle[] = Object.entries(articles)
        .filter(([slug, article]) => slug !== currentSlug && article.category === currentCategory)
        .slice(0, 3)
        .map(([slug, article]) => ({
            slug,
            title: article.title,
            excerpt: article.excerpt,
            category: article.category,
        }));

    // If no same-category articles, get any other articles
    if (relatedArticles.length < 3) {
        const moreArticles = Object.entries(articles)
            .filter(([slug]) => slug !== currentSlug && !relatedArticles.find(a => a.slug === slug))
            .slice(0, 3 - relatedArticles.length)
            .map(([slug, article]) => ({
                slug,
                title: article.title,
                excerpt: article.excerpt,
                category: article.category,
            }));
        relatedArticles.push(...moreArticles);
    }

    if (relatedArticles.length === 0) return null;

    const categoryColors: Record<string, string> = {
        tips: 'bg-blue-100 text-blue-700',
        economie: 'bg-green-100 text-green-700',
        retete: 'bg-orange-100 text-orange-700',
        ghiduri: 'bg-purple-100 text-purple-700',
    };

    return (
        <section className="mt-12 pt-8 border-t border-neutral-200">
            <h3 className="font-display text-xl font-bold text-neutral-900 mb-6">
                Articole similare
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
                {relatedArticles.map((article) => (
                    <Link
                        key={article.slug}
                        href={`/blog/${article.slug}`}
                        className="group block p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                    >
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${categoryColors[article.category] || 'bg-neutral-100 text-neutral-600'}`}>
                            {article.category}
                        </span>
                        <h4 className="font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-1">
                            {article.title}
                        </h4>
                        <p className="text-sm text-neutral-600 line-clamp-2">
                            {article.excerpt}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
