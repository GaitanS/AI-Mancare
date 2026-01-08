import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { notFound as notFoundPage } from 'next/navigation';

export const revalidate = 3600; // Revalidate every hour

interface Props {
    params: {
        slug: string;
    };
}

async function getRecipe(slug: string) {
    const recipe = await prisma.recipe.findUnique({
        where: { slug },
        include: {
            ingredients: true,
        },
    });

    if (!recipe) return null;

    // Parse JSON fields if necessary
    let parsedTags = recipe.tags;
    if (typeof parsedTags === 'string') {
        try {
            parsedTags = JSON.parse(parsedTags);
        } catch {
            parsedTags = [];
        }
    }

    let parsedInstructions = recipe.instructions;
    if (typeof parsedInstructions === 'string') {
        try {
            parsedInstructions = JSON.parse(parsedInstructions);
        } catch {
            parsedInstructions = [];
        }
    }

    let parsedTips = recipe.tips;
    if (typeof parsedTips === 'string') {
        try {
            parsedTips = JSON.parse(parsedTips);
        } catch {
            parsedTips = [];
        }
    }

    let parsedNutrition = recipe.nutritionPerServing;
    if (typeof parsedNutrition === 'string') {
        try {
            parsedNutrition = JSON.parse(parsedNutrition);
        } catch {
            parsedNutrition = null;
        }
    }

    return {
        ...recipe,
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        instructions: Array.isArray(parsedInstructions) ? parsedInstructions : [],
        tips: Array.isArray(parsedTips) ? parsedTips : [],
        nutritionPerServing: parsedNutrition as any,
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const recipe = await getRecipe(params.slug);

    if (!recipe) {
        return {
            title: 'Rețetă negăsită - CatalogSmart',
        };
    }

    return {
        title: `${recipe.title} - Rețete Economice | CatalogSmart`,
        description: recipe.description.substring(0, 160),
        openGraph: {
            images: recipe.imageUrl ? [recipe.imageUrl] : [],
        },
    };
}

const difficultyConfig = {
    USOR: { label: 'Ușor', color: 'text-emerald-700 bg-emerald-50' },
    MEDIU: { label: 'Mediu', color: 'text-amber-700 bg-amber-50' },
    DIFICIL: { label: 'Dificil', color: 'text-rose-700 bg-rose-50' },
};

export default async function RecipePage({ params }: Props) {
    const recipe = await getRecipe(params.slug);

    if (!recipe) {
        notFound();
    }

    const difficultyInfo = difficultyConfig[recipe.difficulty as keyof typeof difficultyConfig] || difficultyConfig.MEDIU;

    return (
        <div className="min-h-screen bg-[#FDFBF7] pb-20">
            {/* Header Image Area */}
            <div className="relative h-[40vh] md:h-[50vh] bg-neutral-900">
                {recipe.imageUrl ? (
                    <Image
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        fill
                        className="object-cover opacity-80"
                        quality={90}
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                        <span className="text-neutral-500">Fără imagine</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

                {/* Back Button */}
                <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
                    <Link
                        href="/plan"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-medium hover:bg-white/20 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Înapoi la Planificator
                    </Link>
                </div>

                {/* Title Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10 max-w-5xl mx-auto w-full">
                    {recipe.tags && recipe.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="inline-block px-3 py-1 bg-primary-500/20 backdrop-blur-md border border-primary-500/30 text-primary-100 text-xs font-bold uppercase tracking-wider rounded-full mb-4 mr-2">
                            {tag}
                        </span>
                    ))}
                    <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
                        {recipe.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-white/90 font-medium">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${difficultyInfo.color} border border-white/10`}>
                            {difficultyInfo.label}
                        </span>
                        {recipe.totalTime && (
                            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {recipe.totalTime} min
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {recipe.servings} porții
                        </span>
                        {recipe.estimatedCost && (
                            <span className="flex items-center gap-1.5 bg-emerald-900/60 text-emerald-100 px-3 py-1 rounded-full backdrop-blur-sm border border-emerald-500/30">
                                <span className="font-bold">{recipe.estimatedCost.toFixed(0)} RON</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="container-custom py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12 max-w-6xl mx-auto">
                    {/* Main Content */}
                    <div className="space-y-10">

                        {/* Description */}
                        <section className="prose prose-lg prose-neutral max-w-none">
                            <p className="lead text-neutral-600 font-medium">
                                {recipe.description}
                            </p>
                        </section>

                        {/* Instructions */}
                        <section>
                            <h2 className="font-display text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </span>
                                Mod de preparare
                            </h2>
                            <div className="space-y-8">
                                {recipe.instructions.map((step: any, idx: number) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-primary-100 text-primary-700 font-bold flex items-center justify-center shadow-sm group-hover:border-primary-500 group-hover:bg-primary-50 transition-colors">
                                            {step.step || idx + 1}
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-neutral-700 leading-relaxed text-lg">
                                                {step.text || step}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Tips */}
                        {recipe.tips && recipe.tips.length > 0 && (
                            <section className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                <h3 className="font-display font-bold text-lg text-amber-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Sfaturi utile
                                </h3>
                                <ul className="space-y-3">
                                    {recipe.tips.map((tip: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-amber-800">
                                            <span className="text-amber-500 mt-1.5">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Ingredients Card */}
                        <div className="bg-white rounded-2xl shadow-card border border-neutral-100 p-6 sticky top-24">
                            <h3 className="font-display font-bold text-xl text-neutral-900 mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Ingrediente
                            </h3>
                            <ul className="space-y-4">
                                {recipe.ingredients.map((ing: any) => (
                                    <li key={ing.id} className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-50 last:border-0 last:pb-0">
                                        <div>
                                            <div className="font-medium text-neutral-800">{ing.name}</div>
                                            {ing.store && (
                                                <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    {ing.store}
                                                </div>
                                            )}
                                        </div>
                                        <div className="font-bold text-neutral-700 whitespace-nowrap">
                                            {formatPrice(ing.price)}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-6 pt-6 border-t border-neutral-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-neutral-500 font-medium">Cost estimat</span>
                                    <span className="text-2xl font-bold text-primary-600">
                                        {recipe.estimatedCost ? formatPrice(recipe.estimatedCost) : '-'}
                                    </span>
                                </div>
                                <Link
                                    href="/plan"
                                    className="block w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-center font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/20"
                                >
                                    Adaugă în Plan
                                </Link>
                            </div>
                        </div>

                        {/* Nutrition Card */}
                        {recipe.nutritionPerServing && (
                            <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                                <h3 className="font-bold text-neutral-900 mb-4 text-sm uppercase tracking-wider">
                                    Valori Nutriționale
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                                        <div className="text-2xl font-bold text-neutral-900">
                                            {recipe.nutritionPerServing.calories || '-'}
                                        </div>
                                        <div className="text-xs text-neutral-500 font-medium">Kcal</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                                        <div className="text-2xl font-bold text-neutral-900">
                                            {recipe.nutritionPerServing.protein || '-'}g
                                        </div>
                                        <div className="text-xs text-neutral-500 font-medium">Proteine</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                                        <div className="text-2xl font-bold text-neutral-900">
                                            {recipe.nutritionPerServing.carbs || '-'}g
                                        </div>
                                        <div className="text-xs text-neutral-500 font-medium">Carbohidrați</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-neutral-100 text-center">
                                        <div className="text-2xl font-bold text-neutral-900">
                                            {recipe.nutritionPerServing.fat || '-'}g
                                        </div>
                                        <div className="text-xs text-neutral-500 font-medium">Grăsimi</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
