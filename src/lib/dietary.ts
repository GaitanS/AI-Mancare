/**
 * Utility to calculate strict dietary flags based on recipe text content.
 * Used for both seed data and AI-generated recipes.
 */
export function calculateDietaryFlags(fullText: string): {
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isVegan: boolean;
    isVegetarian: boolean;
} {
    const text = fullText.toLowerCase();

    let isGlutenFree = true;
    let isDairyFree = true;
    let isVegan = true;
    let isVegetarian = true;

    // Rules

    // 1. Meat (Breaks Vegan/Veg)
    const meats = ['pui', 'porc', 'vită', 'vita', 'carne', 'șuncă', 'sunca', 'slănină', 'slanina', 'cârnați', 'carnati', 'pește', 'peste', 'ton'];
    if (meats.some(m => text.includes(m))) {
        isVegan = false;
        isVegetarian = false;
    }

    // 2. Eggs/Dairy (Breaks Vegan (Eggs), Dairy Free (Dairy))
    const dairy = ['lapte', 'smântână', 'smantana', 'iaurt', 'brânză', 'branza', 'cașcaval', 'cascaval', 'unt', 'frișcă', 'frisca', 'parmezan'];
    if (dairy.some(d => text.includes(d))) {
        isDairyFree = false;
        isVegan = false;
    }

    // Eggs are tricky, "ou" matches "noua". Use regex or cleaner check.
    // Simple check for "ou " or "oua"
    if (text.includes('ouă') || text.includes('oua') || /\bou\b/.test(text)) {
        isVegan = false;
        // Vegetarian is still true
    }

    // 3. Gluten
    const gluten = ['pâine', 'paine', 'făină', 'faina', 'pesmet', 'paste', 'crutoane', 'grâu', 'grau', 'gluten'];
    if (gluten.some(g => text.includes(g))) {
        isGlutenFree = false;
    }

    // Heuristics for typical dishes
    if (text.includes('paste')) isGlutenFree = false;

    // Explicit exclusions if the AI explicitly stated something (optional)
    if (text.includes('vegan') && !text.includes('non-vegan')) {
        // Trust explicit label if present? Maybe dangerous if ingredients contradict.
        // Let's stick to negative constraints for safety.
    }

    return {
        isGlutenFree,
        isDairyFree,
        isVegan,
        isVegetarian
    };
}
