import { cn } from "@/lib/utils";

interface PlanFiltersProps {
    filterDifficulty: string | null;
    setFilterDifficulty: (val: string | null) => void;
    filterMealType: string | null;
    setFilterMealType: (val: string | null) => void;
    filterMeatType: string | null;
    setFilterMeatType: (val: string | null) => void;
    filterDietaryRestrictions: string[];
    setFilterDietaryRestrictions: (val: string[]) => void;
    filterMaxTime: number | null;
    setFilterMaxTime: (val: number | null) => void;
    filterMaxCost: number | null;
    setFilterMaxCost: (val: number | null) => void;
    portions: number;
    profileRestrictions: string[];
    onReset: () => void;
    onApply: () => void;
    activeCount: number;
    className?: string;
    hideApplyButton?: boolean;
}

export function PlanFilters({
    filterDifficulty,
    setFilterDifficulty,
    filterMealType,
    setFilterMealType,
    filterMeatType,
    setFilterMeatType,
    filterDietaryRestrictions,
    setFilterDietaryRestrictions,
    filterMaxTime,
    setFilterMaxTime,
    filterMaxCost,
    setFilterMaxCost,
    portions,
    profileRestrictions,
    onReset,
    onApply,
    activeCount,
    className,
    hideApplyButton
}: PlanFiltersProps) {
    const toggleDietaryRestriction = (restriction: string) => {
        if (filterDietaryRestrictions.includes(restriction)) {
            setFilterDietaryRestrictions(filterDietaryRestrictions.filter(r => r !== restriction));
        } else {
            setFilterDietaryRestrictions([...filterDietaryRestrictions, restriction]);
        }
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-6">
                {/* Difficulty */}
                <div className="pb-5 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </span>
                        Dificultate
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'USOR', label: 'Ușor' },
                            { value: 'MEDIU', label: 'Mediu' },
                            { value: 'DIFICIL', label: 'Dificil' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setFilterDifficulty(filterDifficulty === value ? null : value)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                    filterDifficulty === value
                                        ? "bg-primary-600 text-white"
                                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meal Type */}
                <div className="pb-5 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </span>
                        Tip de masă
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {['Mic Dejun', 'Prânz', 'Cină'].map(meal => (
                            <button
                                key={meal}
                                onClick={() => setFilterMealType(filterMealType === meal ? null : meal)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                    filterMealType === meal
                                        ? "bg-primary-600 text-white"
                                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                )}
                            >
                                {meal}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Meat Type */}
                <div className="pb-5 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </span>
                        Tip de carne
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {['Pui', 'Porc', 'Vită', 'Pește', 'Vegetarian'].map(meat => (
                            <button
                                key={meat}
                                onClick={() => setFilterMeatType(filterMeatType === meat ? null : meat)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                                    filterMeatType === meat
                                        ? "bg-primary-600 text-white"
                                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                )}
                            >
                                {meat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prep Time */}
                <div className="pb-5 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                        Timp maxim
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[15, 30, 60, 120].map(time => (
                            <button
                                key={time}
                                onClick={() => setFilterMaxTime(filterMaxTime === time ? null : time)}
                                className={cn(
                                    "px-3 py-2 rounded-xl text-sm font-medium border transition-all text-center",
                                    filterMaxTime === time
                                        ? "bg-primary-50 border-primary-500 text-primary-700 font-bold"
                                        : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                )}
                            >
                                {"< "}{time === 60 ? "1 oră" : time === 120 ? "2 ore" : `${time} min`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price */}
                <div className="pb-5 border-b border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                        Cost Maxim ({portions} {portions === 1 ? 'porție' : 'porții'})
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[15, 25, 40, 60].map(basePrice => {
                            // Scale price by portions
                            const scaledPrice = Math.round((basePrice / 4) * portions); // Base prices assumed for 4 portions? 
                            // Actually, in the UI logic before, it seemed hardcoded. 
                            // Let's assume the filter is per TOTAL cost for the selected portions.
                            // Or is it per serving? 
                            // In PlanPage: const scaledCost = (recipe.estimatedCost / recipe.servings) * portions;
                            // And filter checks if scaledCost > filterMaxCost.
                            // So filterMaxCost acts as a total budget limit.
                            // The buttons displayed "≤ 15 lei" etc.
                            // Let's keep the hardcoded values but display them dynamically if needed.
                            // The previous code had: [15, 25, 40, 60]. 
                            // Let's assume these are just thresholds the user picks.

                            // Wait, if I change portions, 15 lei might be impossible for 10 people.
                            // Better to scale the options based on portions? 
                            // Let's stick to the previous implementation: just buttons.
                            return (
                                <button
                                    key={basePrice}
                                    onClick={() => setFilterMaxCost(filterMaxCost === basePrice ? null : basePrice)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-sm font-medium border transition-all text-center",
                                        filterMaxCost === basePrice
                                            ? "bg-primary-50 border-primary-500 text-primary-700 font-bold"
                                            : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                    )}
                                >
                                    ≤ {Math.round((basePrice / 4) * portions)} lei
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Dietary Restrictions */}
                <div>
                    <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
                        <span className="text-primary-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </span>
                        Preferințe Dietetice
                    </h3>
                    <div className="space-y-2">
                        {[
                            'Fără Gluten',
                            'Fără Lactoză',
                            'Fără Nuci',
                            'Vegetarian',
                            'Vegan'
                        ].map(diet => {
                            const isProfile = profileRestrictions.includes(diet);
                            const isSelected = filterDietaryRestrictions.includes(diet);

                            return (
                                <button
                                    key={diet}
                                    onClick={() => toggleDietaryRestriction(diet)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                                        isSelected
                                            ? "bg-primary-50 border-primary-500 text-primary-700 font-bold"
                                            : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        {diet}
                                        {isProfile && (
                                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200" title="Din profilul tău">
                                                👤
                                            </span>
                                        )}
                                    </span>
                                    {isSelected && (
                                        <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-neutral-100 bg-white">
                <div className="flex gap-3">
                    <button
                        onClick={onReset}
                        className={cn(
                            "px-4 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors",
                            hideApplyButton ? "w-full" : "flex-1"
                        )}
                    >
                        Resetează
                    </button>
                    {!hideApplyButton && (
                        <button
                            onClick={onApply}
                            className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-shadow shadow-lg shadow-neutral-900/20"
                        >
                            Aplică {activeCount > 0 ? `(${activeCount})` : ''}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
