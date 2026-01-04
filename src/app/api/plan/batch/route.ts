
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';


export async function POST(request: NextRequest) {
    try {
        const { recipeIds } = await request.json();

        if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No recipe IDs provided' },
                { status: 400 }
            );
        }

        // Fetch full recipe details
        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: recipeIds }
            }
        });

        if (recipes.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Recipes not found' },
                { status: 404 }
            );
        }

        // --- BATCH LOGIC (Simulated "AI" Optimization) ---

        // 1. Identify common ingredients (heuristic based on tags/title for now)
        const prepGroups: any[] = [];

        // Check for Chicken recipes
        const chickenRecipes = recipes.filter((r: any) =>
            r.title.toLowerCase().includes('pui') ||
            (r.tags && r.tags.toLowerCase().includes('pui'))
        );

        if (chickenRecipes.length > 0) {
            prepGroups.push({
                group: "Carne",
                action: `Pregătește puiul pentru ${chickenRecipes.length} rețete`,
                details: chickenRecipes.map((r: any) => `Pentru "${r.title}": Taie puiul cubulețe/fâșii conform rețetei.`),
                estimatedTime: "10 min",
                recipes: chickenRecipes.map((r: any) => r.title)
            });
        }

        // Check for Vegetable heavy recipes
        const vegRecipes = recipes.filter((r: any) =>
            r.title.toLowerCase().includes('legume') ||
            r.title.toLowerCase().includes('salata') ||
            (r.tags && r.tags.toLowerCase().includes('vegetarian'))
        );

        if (vegRecipes.length > 0) {
            prepGroups.push({
                group: "Legume",
                action: "Spală și taie toate legumele",
                details: [
                    "Curăță ceapa și usturoiul pentru toate rețetele.",
                    "Spală roșiile și ardeii.",
                    "Toacă legumele după cum urmează: mărunt pentru ciorbă, felii pentru salată."
                ],
                estimatedTime: "15 min",
                recipes: vegRecipes.map((r: any) => r.title)
            });
        }

        // Check for oven usage
        // (mocking this logic as we assume most main dishes might use heat)
        prepGroups.push({
            group: "Gătire Termică",
            action: "Gătit simultan",
            details: ["Dacă folosești cuptorul, poți găti mai multe feluri deodată pentru a economisi energie."],
            estimatedTime: "Variabil",
            recipes: recipes.map((r: any) => r.title)
        });


        // 2. Generate optimized schedule
        const schedule = [
            { step: 1, title: 'Mise en place', description: 'Pregătește spațiul de lucru și scoate toate ingredientele.' },
            ...prepGroups.map((g: any, idx: number) => ({
                step: idx + 2,
                title: g.action,
                description: g.details.join(' '),
                relatedRecipes: g.recipes
            })),
            { step: prepGroups.length + 2, title: 'Asamblare finală', description: 'Finalizează fiecare rețetă individual.' }
        ];

        return NextResponse.json({
            success: true,
            data: {
                recipes: recipes.map((r: any) => ({ id: r.id, title: r.title })),
                optimizedSchedule: schedule,
                totalPrepTime: "Approx. 45-60 min" // heuristic
            }
        });

    } catch (error) {
        console.error('Batch API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate batch plan' },
            { status: 500 }
        );
    }
}
