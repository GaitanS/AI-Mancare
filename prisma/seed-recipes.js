const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const recipes = [
    {
        title: 'Ciorbă de legume',
        description: 'Ciorbă tradițională cu multe legume proaspete, perfectă pentru un prânz sănătos.',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        difficulty: 'USOR',
        estimatedCost: 25.00,
        tags: JSON.stringify(['Vegetarian', 'Low Carb', 'Sănătos']), // Storing array as JSON if schema is String? Wait, schema says String?
        // Checking schema: tags String? 
        // Usually tags are comma separated or JSON. In the frontend it treated it as array.
        // The previous GET API endpoint split the string by comma if it was passed as param, 
        // but the mapper did: tags: r.tags as string[] | null.
        // Wait, in schema: tags String?
        // In `route.ts`: tags: r.tags as string[] | null. This implies the Prisma result `r.tags` is ALREADY castable? 
        // SQLite doesn't have string[] type. It must be JSON.
        // Let's assume it's stored as JSON string "[\"tag1\", \"tag2\"]".

        slug: 'ciorba-de-legume',
        instructions: JSON.stringify([
            "Curăță toate legumele.",
            "Toacă ceapa mărunt și restul legumelor cubulețe.",
            "Călește ceapa 5 minute.",
            "Adaugă restul legumelor și apă.",
            "Lasă la fiert 30 minute."
        ]),
        ingredientIds: "[]" // We can link real ingredients later
    },
    {
        title: 'Paste cu sos de roșii',
        description: 'Paste simple și gustoase cu roșii proaspete și busuioc.',
        servings: 2,
        prepTime: 5,
        cookTime: 20,
        totalTime: 25,
        difficulty: 'USOR',
        estimatedCost: 18.50,
        slug: 'paste-sos-rosii',
        instructions: JSON.stringify([
            "Fierbe apa cu sare.",
            "Adaugă pastele și fierbe conform instrucțiunilor.",
            "Într-o tigaie, încălzește sosul de roșii.",
            "Amestecă pastele cu sosul."
        ]),
        tags: JSON.stringify(['Rapid', 'Vegetarian', 'Ieftin']),
        ingredientIds: "[]"
    },
    {
        title: 'Piept de pui la grătar',
        description: 'Piept de pui suculent cu condimente, gătit rapid la grătar.',
        servings: 2,
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'MEDIU',
        estimatedCost: 35.00,
        slug: 'piept-pui-gratar',
        instructions: JSON.stringify([
            "Spală și usucă pieptul de pui.",
            "Condimentează cu sare, piper și boia.",
            "Încinge grătarul.",
            "Gătește puiul 5-7 minute pe fiecare parte."
        ]),
        tags: JSON.stringify(['High Protein', 'Low Carb', 'Fitness']),
        ingredientIds: "[]"
    },
    {
        title: 'Salată Caesar',
        description: 'Salată verde cu sos cremos, crutoane și parmezan.',
        servings: 2,
        prepTime: 15,
        cookTime: 0,
        totalTime: 15,
        difficulty: 'USOR',
        estimatedCost: 22.00,
        slug: 'salata-caesar',
        instructions: JSON.stringify([
            "Spală salata și rupe-o bucăți.",
            "Taie pieptul de pui (dacă folosești) fâșii.",
            "Amestecă salata cu sosul Caesar.",
            "Adaugă crutoanele și parmezanul."
        ]),
        tags: JSON.stringify(['Low Carb', 'High Protein', 'Rapid']),
        ingredientIds: "[]"
    },
    {
        title: 'Tocăniță de pui',
        description: 'Tocăniță aromată cu legume și sos bogat de mărar.',
        servings: 4,
        prepTime: 20,
        cookTime: 40,
        totalTime: 60,
        difficulty: 'MEDIU',
        estimatedCost: 42.00,
        slug: 'tocanita-pui',
        instructions: JSON.stringify([
            "Taie puiul bucăți.",
            "Călește ceapa și usturoiul.",
            "Adaugă puiul și rumenește-l.",
            "Adaugă apă și lasă la fiert."
        ]),
        tags: JSON.stringify(['Tradițional', 'Comfort Food']),
        ingredientIds: "[]"
    },
    {
        title: 'Omletă cu legume',
        description: 'Omletă pufoasă cu ardei, ceapă și ciuperci.',
        servings: 1,
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        difficulty: 'USOR',
        estimatedCost: 8.00,
        slug: 'omleta-legume',
        instructions: JSON.stringify([
            "Bate ouăle cu sare și piper.",
            "Taie legumele cubulețe.",
            "Călește legumele în puțin ulei.",
            "Toarnă ouăle peste legume."
        ]),
        tags: JSON.stringify(['Mic dejun', 'High Protein', 'Rapid']),
        ingredientIds: "[]"
    }
];

async function main() {
    console.log('Seeding recipes...');

    // Clear existing recipes to avoid duplicates/conflicts if we re-seed
    // await prisma.recipe.deleteMany({}); 
    // (Optional, but safer to upsert or check existence. For complexity 3, just check count or create)

    for (const r of recipes) {
        const existing = await prisma.recipe.findUnique({ where: { slug: r.slug } });
        if (!existing) {
            await prisma.recipe.create({
                data: {
                    ...r,
                    // Parse tags back to array? No, schema says String? 
                    // Wait, looking at schema provided earlier: `tags String?`
                    // Looking at `route.ts` provided earlier: `tags: r.tags as string[] | null`.
                    // Wait, if schema is `String?`, then `r.tags` is a string. 
                    // In SQLite, JSON arrays are strings. Prisma might NOT automatically parse it unless configured.
                    // The route.ts likely does manual parsing or casting if it expects array.
                    // But wait, the route.ts said: `tags: r.tags as string[] | null`. 
                    // If the type generated by Prisma is string | null, casting it to string[] is a TS lie unless middleware transforms it.
                    // Let's assume for seeded data I should store it as actual JSON string. 
                    // But verify route.ts again...
                    // "tags: r.tags as string[] | null" -> This suggests the Prisma Type might generate `tags: Json` if the provider was Postgres, but for SQLite it's usually String.
                    // Let's look at schema again carefully.
                    // `tags String?`
                    // So it MUST be a string in DB.
                    // If I store `JSON.stringify(['a', 'b'])`, then in DB it is `["a","b"]`.
                    // The API code `r.tags as string[]` might be failing if it's a string, or it relies on the frontend/client to parse it, OR it assumes it's already an array because of some Prisma extension I didn't see.
                    // Actually, in `route.ts`: `const result = await cached(..., async () => { ... return recipes.map(r => ({ ... tags: r.tags as string[] | null })) })`.
                    // This suggests the developer THINKS it's an array.
                    // If I store it as JSON string, `r.tags` will be a string.
                    // Let's update `route.ts` to parse it if needed, OR just store it as comma separated string?
                    // "tags: ['Vegetarian', 'Low Carb' ...]" in frontend.
                    // Let's store as JSON string in seed, and I might need to fix `route.ts` if it crashes.
                    // But looking at schema `instructions String`, `ingredientIds String`. These are definitely JSON strings.
                    // So tags should likely be JSON string too.
                }
            });
            console.log(`Created ${r.title}`);
        } else {
            console.log(`Skipped ${r.title} (already exists)`);
        }
    }

    console.log(`Seeded ${recipes.length} recipes.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
