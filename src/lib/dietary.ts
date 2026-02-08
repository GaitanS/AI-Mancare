/**
 * Utility to calculate strict dietary flags based on recipe text content.
 * Used for both seed data and AI-generated recipes.
 */

/**
 * Helper: check if any keyword appears as a whole word in text
 * Uses word boundary regex to avoid false positives (e.g. "unt" in "punct")
 */
function containsWord(text: string, words: string[]): boolean {
    return words.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

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
    if (containsWord(text, meats)) {
        isVegan = false;
        isVegetarian = false;
    }

    // 2. Eggs/Dairy (Breaks Vegan (Eggs), Dairy Free (Dairy))
    const dairy = ['lapte', 'smântână', 'smantana', 'iaurt', 'brânză', 'branza', 'cașcaval', 'cascaval', 'unt', 'frișcă', 'frisca', 'parmezan'];
    if (containsWord(text, dairy)) {
        isDairyFree = false;
        isVegan = false;
    }

    // Eggs - "ou" handled with word boundary to avoid matching "noua", etc.
    if (text.includes('ouă') || text.includes('oua') || /\bou\b/.test(text)) {
        isVegan = false;
        // Vegetarian is still true
    }

    // 3. Gluten
    const gluten = ['pâine', 'paine', 'făină', 'faina', 'pesmet', 'paste', 'crutoane', 'grâu', 'grau', 'gluten'];
    if (containsWord(text, gluten)) {
        isGlutenFree = false;
    }

    return {
        isGlutenFree,
        isDairyFree,
        isVegan,
        isVegetarian
    };
}
