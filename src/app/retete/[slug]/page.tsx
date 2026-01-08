import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { Recipe } from '@/types';

export const revalidate = 3600; // Revalidate every hour

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

// Interfaces
interface RecipeStep {
    step: number;
    text: string;
}

interface Nutrition {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface Ingredient {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    store: string;
    unit: string;
    quantity: number;
}

async function getRecipe(slug: string) {
    const recipe = await prisma.recipe.findUnique({
        where: { slug },
        // No include needed as ingredients are in ingredientIds JSON
    });

    if (!recipe) return null;

    // Parse Tags
    let parsedTags: string[] = [];
    if (recipe.tags) {
        if (typeof recipe.tags === 'string') {
            try {
                parsedTags = JSON.parse(recipe.tags);
            } catch {
                parsedTags = [];
            }
        } else if (Array.isArray(recipe.tags)) {
            parsedTags = recipe.tags as string[];
        }
    }

    // Parse Instructions and Normalize
    let parsedInstructions: RecipeStep[] = [];
    if (recipe.instructions) {
        let rawInstructions: any = [];
        if (typeof recipe.instructions === 'string') {
            try {
                rawInstructions = JSON.parse(recipe.instructions);
            } catch {
                rawInstructions = [];
            }
        } else {
            rawInstructions = recipe.instructions;
        }

        if (Array.isArray(rawInstructions)) {
            parsedInstructions = rawInstructions.map((item: any, index: number) => {
                if (typeof item === 'string') {
                    return { step: index + 1, text: item };
                }
                return item as RecipeStep;
            });
        }
    }

    // Parse Tips
    let parsedTips: string[] = [];
    if (recipe.tips) {
        if (typeof recipe.tips === 'string') {
            try {
                parsedTips = JSON.parse(recipe.tips);
            } catch {
                parsedTips = [];
            }
        } else if (Array.isArray(recipe.tips)) {
            parsedTips = recipe.tips as string[];
        }
    }

    // Parse Nutrition
    let parsedNutrition: Nutrition | null = null;
    if (recipe.nutritionPerServing) {
        if (typeof recipe.nutritionPerServing === 'string') {
            try {
                parsedNutrition = JSON.parse(recipe.nutritionPerServing);
            } catch {
                parsedNutrition = null;
            }
        } else {
            parsedNutrition = recipe.nutritionPerServing as unknown as Nutrition;
        }
    }

    // Parse Ingredients from ingredientIds
    let parsedIngredients: Ingredient[] = [];
    if (recipe.ingredientIds) {
        if (typeof recipe.ingredientIds === 'string') {
            try {
                // Assuming ingredientIds actually stores the full ingredient objects snapshot
                parsedIngredients = JSON.parse(recipe.ingredientIds);
            } catch {
                parsedIngredients = [];
            }
        } else {
            // If it's already an object (Prisma Json type)
            parsedIngredients = recipe.ingredientIds as unknown as Ingredient[];
        }
    }

    // Ensure it's an array
    if (!Array.isArray(parsedIngredients)) {
        parsedIngredients = [];
    }

    return {
        ...recipe,
        tags: parsedTags,
        instructions: parsedInstructions,
        tips: parsedTips,
        nutritionPerServing: parsedNutrition,
        ingredients: parsedIngredients, // Explicitly provide ingredients
    };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
    const params = await props.params;
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

export default async function RecipePage(props: Props) {
    const params = await props.params;
    const recipe = await getRecipe(params.slug);

    if (!recipe) {
        notFound();
    }

    const difficultyInfo = difficultyConfig[recipe.difficulty as keyof typeof difficultyConfig] || difficultyConfig.MEDIU;

    return (
        <div className="min-h-screen bg-[#FDFBF7] pb-24 md:pb-20"> {/* Added pb-24 for sticky footer */}
            {/* Header Image Area */}
            <div className="relative h-[50vh] md:h-[60vh] lg:h-[50vh] w-full">
                {recipe.imageUrl ? (
                    <Image
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        fill
                        className="object-cover"
                        quality={90}
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                        <span className="text-neutral-500">Fără imagine</span>
                    </div>
                )}
                {/* Gradient Overlay - Darker at bottom for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

                {/* Navbar/Back Button Area */}
                <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start">
                    <Link
                        href="/plan"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    {/* Share Button Placeholder */}
                    <button className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-colors shadow-lg">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>

                {/* Title & Meta - Bottom of Hero */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <div className="container-custom max-w-6xl mx-auto">
                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipe.tags && recipe.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="px-2.5 py-1 bg-primary-500/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm border border-primary-400/50">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-md">
                            {recipe.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm font-medium">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 ${difficultyInfo.color.replace('bg-', 'bg-black/40 ').replace('text-', 'text-white ')}`}>
                                <span className={`w-2 h-2 rounded-full ${difficultyInfo.color.replace('text-', 'bg-').split(' ')[0]}`}></span>
                                {difficultyInfo.label}
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {recipe.totalTime} min
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {recipe.servings} porții
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Actions Bar (Under Image) */}
            <div className="md:hidden bg-white border-b border-neutral-100 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Cost Estimat</span>
                    <span className="text-xl font-bold text-primary-600 font-display">
                        {recipe.estimatedCost ? formatPrice(Number(recipe.estimatedCost)) : '-'}
                    </span>
                </div>
                <button className="p-2 rounded-full hover:bg-neutral-50 text-neutral-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>

            <div className="container-custom py-8 md:py-12">
                {/* Mobile: Stack Ingredients First? Or Description?
                    Desktop: Side-by-side.
                    App style: Often Description -> Ad -> Ingredients -> Instructions
                */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 md:gap-12 max-w-6xl mx-auto">

                    {/* LEFT COLUMN (Desktop) / TOP (Mobile) */}
                    <div className="space-y-8 md:space-y-10">

                        {/* Description */}
                        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-neutral-100">
                            <p className="text-lg md:text-xl text-neutral-600 leading-relaxed font-serif">
                                {recipe.description}
                            </p>
                        </section>

                        {/* MOBILE ONLY: Ingredients Accordion Effect or Block */}
                        <div className="lg:hidden">
                            {/* Ad Slot #1 */}
                            <div className="w-full h-24 bg-neutral-100 rounded-xl flex items-center justify-center mb-8 border border-neutral-200 border-dashed">
                                <span className="text-neutral-400 text-sm font-medium uppercase tracking-widest">Reclamă</span>
                            </div>

                            <div className="bg-white rounded-3xl shadow-card border border-neutral-100 p-6">
                                <h3 className="font-display font-bold text-xl text-neutral-900 mb-6 flex items-center gap-2">
                                    <svg className="w-6 h-6 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    Ingrediente
                                </h3>
                                <ul className="space-y-4">
                                    {recipe.ingredients.map((ing) => (
                                        <li key={ing.id} className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-50 last:border-0 last:pb-0">
                                            <div className="flex-1">
                                                <div className="font-medium text-neutral-800 text-base">{ing.name}</div>
                                                {ing.store && (
                                                    <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                        {ing.store}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="font-bold text-neutral-700 whitespace-nowrap bg-neutral-50 px-2 py-1 rounded-lg text-sm">
                                                {formatPrice(ing.price)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Instructions */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-display text-2xl font-bold text-neutral-900 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shadow-sm">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </span>
                                    Mod de preparare
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {recipe.instructions.map((step, idx: number) => (
                                    <div key={idx} className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex gap-5 group hover:border-primary-100 transition-colors">
                                        <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-50 border-2 border-primary-100 text-primary-700 font-bold flex items-center justify-center shadow-inner mt-1">
                                            {step.step || idx + 1}
                                        </div>
                                        <div className="pt-1">
                                            <p className="text-neutral-700 leading-relaxed text-lg">
                                                {step.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Ad Slot #2 */}
                        <div className="w-full h-64 bg-neutral-100 rounded-2xl flex items-center justify-center border border-neutral-200 border-dashed">
                            <span className="text-neutral-400 text-sm font-medium uppercase tracking-widest">Reclamă Mare</span>
                        </div>

                        {/* Tips */}
                        {recipe.tips && recipe.tips.length > 0 && (
                            <section className="bg-amber-50 rounded-3xl p-8 border border-amber-100 relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100 rounded-full opacity-50 blur-2xl"></div>
                                <h3 className="font-display font-bold text-xl text-amber-900 mb-6 flex items-center gap-2 relative z-10">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Sfaturi utile
                                </h3>
                                <ul className="space-y-4 relative z-10">
                                    {recipe.tips.map((tip: string, i: number) => (
                                        <li key={i} className="flex gap-4 text-amber-900/80 bg-white/50 p-4 rounded-xl border border-amber-100/50">
                                            <span className="text-amber-500 font-bold text-lg">•</span>
                                            <span className="font-medium">{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* RIGHT COLUMN (Desktop Sticky) - Hidden on Mobile to avoid duplication */}
                    <div className="hidden lg:block space-y-8">
                        {/* Ingredients Card - Desktop */}
                        <div className="bg-white rounded-3xl shadow-card-lg border border-neutral-100 p-8 sticky top-24">
                            <h3 className="font-display font-bold text-2xl text-neutral-900 mb-8 flex items-center gap-3">
                                <svg className="w-7 h-7 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Ingrediente
                            </h3>
                            <ul className="space-y-5">
                                {recipe.ingredients.map((ing) => (
                                    <li key={ing.id} className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-50 last:border-0 last:pb-0">
                                        <div className="flex-1">
                                            <div className="font-bold text-neutral-800">{ing.name}</div>
                                            {ing.store && (
                                                <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    <span className="truncate max-w-[120px]">{ing.store}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-neutral-900 bg-neutral-100 px-3 py-1 rounded-lg">
                                                {formatPrice(ing.price)}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-8 pt-8 border-t border-neutral-100">
                                <AdComponent slot="sidebar_square" />
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-5">
                                    <span className="text-neutral-500 font-bold uppercase tracking-wider text-sm">Total Estimat</span>
                                    <span className="text-3xl font-bold text-primary-600 font-display">
                                        {recipe.estimatedCost ? formatPrice(Number(recipe.estimatedCost)) : '-'}
                                    </span>
                                </div>
                                <Link
                                    href="/plan"
                                    className="block w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white text-center font-bold text-lg rounded-2xl transition-all shadow-xl shadow-primary-600/30 hover:shadow-primary-600/40 hover:-translate-y-0.5"
                                >
                                    Adaugă în Plan
                                </Link>
                            </div>
                        </div>

                        {/* Nutrition Card */}
                        {recipe.nutritionPerServing && (
                            <div className="bg-neutral-50 rounded-3xl p-8 border border-neutral-100">
                                <h3 className="font-bold text-neutral-900 mb-6 text-sm uppercase tracking-wider flex items-center gap-2">
                                    Valori Nutriționale
                                    <span className="text-neutral-400 font-normal normal-case ml-auto">per porție</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-neutral-100 text-center shadow-sm">
                                        <div className="text-3xl font-bold text-neutral-900 font-display">
                                            {recipe.nutritionPerServing.calories || '-'}
                                        </div>
                                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Kcal</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-neutral-100 text-center shadow-sm">
                                        <div className="text-3xl font-bold text-neutral-900 font-display">
                                            {recipe.nutritionPerServing.protein || '-'}
                                            <span className="text-lg text-neutral-400 font-medium ml-0.5">g</span>
                                        </div>
                                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Proteine</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-neutral-100 text-center shadow-sm">
                                        <div className="text-3xl font-bold text-neutral-900 font-display">
                                            {recipe.nutritionPerServing.carbs || '-'}
                                            <span className="text-lg text-neutral-400 font-medium ml-0.5">g</span>
                                        </div>
                                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Carbohidrați</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-neutral-100 text-center shadow-sm">
                                        <div className="text-3xl font-bold text-neutral-900 font-display">
                                            {recipe.nutritionPerServing.fat || '-'}
                                            <span className="text-lg text-neutral-400 font-medium ml-0.5">g</span>
                                        </div>
                                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">Grăsimi</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Mobile Footer Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 p-4 pb-8 lg:hidden z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex gap-4 items-center max-w-lg mx-auto">
                    <div className="flex-1">
                        <span className="text-xs text-neutral-400 block font-medium uppercase tracking-wider mb-0.5">Total</span>
                        <span className="text-2xl font-bold text-primary-600 font-display leading-none">
                            {recipe.estimatedCost ? formatPrice(Number(recipe.estimatedCost)) : '-'}
                        </span>
                    </div>
                    <Link
                        href="/plan"
                        className="flex-1 py-3.5 px-6 bg-primary-600 active:bg-primary-700 text-white text-center font-bold text-lg rounded-xl shadow-lg shadow-primary-600/30 transition-transform active:scale-95"
                    >
                        Adaugă în Plan
                    </Link>
                </div>
            </div>

            {/* Safe Area Spacer for Mobile Footer */}
            <div className="h-20 lg:hidden"></div>
        </div>
    );
}

// Dummy Ad Component for now
function AdComponent({ slot }: { slot: string }) {
    return (
        <div className="w-full bg-neutral-50 rounded-xl border border-neutral-100 border-dashed flex flex-col items-center justify-center py-4 px-2">
            <span className="text-[10px] uppercase font-bold text-neutral-300 tracking-widest mb-1">Publicitate</span>
            <div className="w-full h-[250px] bg-neutral-200/50 rounded-lg animate-pulse" />
        </div>
    );
}
