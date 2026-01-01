import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common Romanian ingredients with their product matching config and aisle order
const ingredientMappings = [
    // 1. Fructe și Legume
    { ingredientName: 'roșii', categoryMatch: 'legume', keywords: JSON.stringify(['roșii', 'tomate', 'cherry']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'ceapă', categoryMatch: 'legume', keywords: JSON.stringify(['ceapă', 'ceapa']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'usturoi', categoryMatch: 'legume', keywords: JSON.stringify(['usturoi']), defaultUnit: 'buc', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'morcovi', categoryMatch: 'legume', keywords: JSON.stringify(['morcovi', 'morcov']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'cartofi', categoryMatch: 'legume', keywords: JSON.stringify(['cartofi', 'cartof']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'ardei', categoryMatch: 'legume', keywords: JSON.stringify(['ardei', 'ardei gras', 'ardei kapia']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'castraveți', categoryMatch: 'legume', keywords: JSON.stringify(['castraveți', 'castravete']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'salată', categoryMatch: 'legume', keywords: JSON.stringify(['salată', 'salata verde', 'iceberg']), defaultUnit: 'buc', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'mere', categoryMatch: 'fructe', keywords: JSON.stringify(['mere', 'măr']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'banane', categoryMatch: 'fructe', keywords: JSON.stringify(['banane', 'banană']), defaultUnit: 'kg', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'lămâie', categoryMatch: 'fructe', keywords: JSON.stringify(['lămâie', 'lămâi']), defaultUnit: 'buc', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'pătrunjel', categoryMatch: 'legume', keywords: JSON.stringify(['pătrunjel', 'patrunjel']), defaultUnit: 'buc', aisleOrder: 1, aisleName: 'Fructe și Legume' },
    { ingredientName: 'mărar', categoryMatch: 'legume', keywords: JSON.stringify(['mărar']), defaultUnit: 'buc', aisleOrder: 1, aisleName: 'Fructe și Legume' },

    // 2. Lactate și Ouă
    { ingredientName: 'lapte', categoryMatch: 'lactate', keywords: JSON.stringify(['lapte', 'lapte proaspăt']), defaultUnit: 'L', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'smântână', categoryMatch: 'lactate', keywords: JSON.stringify(['smântână', 'smantana']), defaultUnit: 'buc', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'iaurt', categoryMatch: 'lactate', keywords: JSON.stringify(['iaurt', 'iaurt grecesc']), defaultUnit: 'buc', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'brânză', categoryMatch: 'lactate', keywords: JSON.stringify(['brânză', 'branza', 'telemea', 'feta']), defaultUnit: 'g', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'cașcaval', categoryMatch: 'lactate', keywords: JSON.stringify(['cașcaval', 'cascaval']), defaultUnit: 'g', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'unt', categoryMatch: 'lactate', keywords: JSON.stringify(['unt', 'unt proaspăt']), defaultUnit: 'g', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'ouă', categoryMatch: 'lactate', keywords: JSON.stringify(['ouă', 'oua', 'ou']), defaultUnit: 'buc', aisleOrder: 2, aisleName: 'Lactate și Ouă' },
    { ingredientName: 'frișcă', categoryMatch: 'lactate', keywords: JSON.stringify(['frișcă', 'frisca']), defaultUnit: 'buc', aisleOrder: 2, aisleName: 'Lactate și Ouă' },

    // 3. Carne și Mezeluri
    { ingredientName: 'pui', categoryMatch: 'carne', keywords: JSON.stringify(['pui', 'piept pui', 'pulpe pui', 'carne pui']), defaultUnit: 'kg', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'porc', categoryMatch: 'carne', keywords: JSON.stringify(['porc', 'carne porc', 'cotlet', 'ceafă']), defaultUnit: 'kg', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'vită', categoryMatch: 'carne', keywords: JSON.stringify(['vită', 'vita', 'carne vită', 'mușchi']), defaultUnit: 'kg', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'carne tocată', categoryMatch: 'carne', keywords: JSON.stringify(['carne tocată', 'tocat', 'carne tocata']), defaultUnit: 'kg', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'slănină', categoryMatch: 'carne', keywords: JSON.stringify(['slănină', 'slanina', 'bacon']), defaultUnit: 'g', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'cârnați', categoryMatch: 'mezeluri', keywords: JSON.stringify(['cârnați', 'carnati']), defaultUnit: 'kg', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },
    { ingredientName: 'șuncă', categoryMatch: 'mezeluri', keywords: JSON.stringify(['șuncă', 'sunca']), defaultUnit: 'g', aisleOrder: 3, aisleName: 'Carne și Mezeluri' },

    // 4. Pâine și Patiserie
    { ingredientName: 'pâine', categoryMatch: 'panificatie', keywords: JSON.stringify(['pâine', 'paine', 'franzela']), defaultUnit: 'buc', aisleOrder: 4, aisleName: 'Pâine și Patiserie' },
    { ingredientName: 'făină', categoryMatch: 'panificatie', keywords: JSON.stringify(['făină', 'faina']), defaultUnit: 'kg', aisleOrder: 4, aisleName: 'Pâine și Patiserie' },
    { ingredientName: 'pesmet', categoryMatch: 'panificatie', keywords: JSON.stringify(['pesmet']), defaultUnit: 'g', aisleOrder: 4, aisleName: 'Pâine și Patiserie' },

    // 5. Conserve și Murături
    { ingredientName: 'roșii conservă', categoryMatch: 'conserve', keywords: JSON.stringify(['roșii conservă', 'roșii decojite', 'bulion', 'pasta tomate']), defaultUnit: 'buc', aisleOrder: 5, aisleName: 'Conserve și Murături' },
    { ingredientName: 'ton', categoryMatch: 'conserve', keywords: JSON.stringify(['ton', 'ton conservă']), defaultUnit: 'buc', aisleOrder: 5, aisleName: 'Conserve și Murături' },
    { ingredientName: 'mazăre', categoryMatch: 'conserve', keywords: JSON.stringify(['mazăre', 'mazare']), defaultUnit: 'buc', aisleOrder: 5, aisleName: 'Conserve și Murături' },
    { ingredientName: 'fasole', categoryMatch: 'conserve', keywords: JSON.stringify(['fasole', 'fasole conservă']), defaultUnit: 'buc', aisleOrder: 5, aisleName: 'Conserve și Murături' },
    { ingredientName: 'porumb', categoryMatch: 'conserve', keywords: JSON.stringify(['porumb', 'porumb conservă']), defaultUnit: 'buc', aisleOrder: 5, aisleName: 'Conserve și Murături' },

    // 6. Produse Congelate
    { ingredientName: 'legume congelate', categoryMatch: 'congelate', keywords: JSON.stringify(['legume congelate', 'mix legume']), defaultUnit: 'kg', aisleOrder: 6, aisleName: 'Produse Congelate' },
    { ingredientName: 'pește', categoryMatch: 'congelate', keywords: JSON.stringify(['pește', 'peste', 'somon', 'file pește']), defaultUnit: 'kg', aisleOrder: 6, aisleName: 'Produse Congelate' },

    // 7. Băuturi
    { ingredientName: 'apă', categoryMatch: 'bauturi', keywords: JSON.stringify(['apă', 'apa minerală']), defaultUnit: 'L', aisleOrder: 7, aisleName: 'Băuturi' },
    { ingredientName: 'suc', categoryMatch: 'bauturi', keywords: JSON.stringify(['suc', 'suc natural']), defaultUnit: 'L', aisleOrder: 7, aisleName: 'Băuturi' },

    // 8. Altele (condimente, uleiuri)
    { ingredientName: 'ulei', categoryMatch: 'uleiuri', keywords: JSON.stringify(['ulei', 'ulei floarea soarelui', 'ulei măsline']), defaultUnit: 'L', aisleOrder: 8, aisleName: 'Uleiuri și Condimente' },
    { ingredientName: 'oțet', categoryMatch: 'condimente', keywords: JSON.stringify(['oțet', 'otet']), defaultUnit: 'buc', aisleOrder: 8, aisleName: 'Uleiuri și Condimente' },
    { ingredientName: 'sare', categoryMatch: 'condimente', keywords: JSON.stringify(['sare']), defaultUnit: 'kg', aisleOrder: 8, aisleName: 'Uleiuri și Condimente' },
    { ingredientName: 'piper', categoryMatch: 'condimente', keywords: JSON.stringify(['piper', 'piper negru']), defaultUnit: 'buc', aisleOrder: 8, aisleName: 'Uleiuri și Condimente' },
    { ingredientName: 'boia', categoryMatch: 'condimente', keywords: JSON.stringify(['boia', 'boia dulce', 'boia iute']), defaultUnit: 'buc', aisleOrder: 8, aisleName: 'Uleiuri și Condimente' },
    { ingredientName: 'zahăr', categoryMatch: 'dulciuri', keywords: JSON.stringify(['zahăr', 'zahar']), defaultUnit: 'kg', aisleOrder: 8, aisleName: 'Dulciuri și Produse de Patiserie' },

    // 9. Paste și Orez
    { ingredientName: 'paste', categoryMatch: 'paste', keywords: JSON.stringify(['paste', 'spaghete', 'penne', 'macaroane']), defaultUnit: 'g', aisleOrder: 9, aisleName: 'Paste și Orez' },
    { ingredientName: 'orez', categoryMatch: 'paste', keywords: JSON.stringify(['orez']), defaultUnit: 'kg', aisleOrder: 9, aisleName: 'Paste și Orez' },
];

async function main() {
    console.log('🌱 Seeding ingredient mappings...');

    for (const mapping of ingredientMappings) {
        await prisma.ingredientMapping.upsert({
            where: { ingredientName: mapping.ingredientName },
            update: mapping,
            create: mapping,
        });
    }

    console.log(`✅ Seeded ${ingredientMappings.length} ingredient mappings`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
