'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const dietaryOptions = [
    { id: 'none', label: 'Fără restricții', iconPath: 'M3 3h18v18H3V3z', type: 'none' },
    { id: 'low_carb', label: 'Low Carb', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', type: 'goal' },
    { id: 'vegetarian', label: 'Vegetarian', iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', type: 'goal' },
    { id: 'high_protein', label: 'High Protein', iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', type: 'goal' },
    { id: 'budget', label: 'Buget mic', iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', type: 'goal' }, // This might map to budget preference logically, but here it's a "goal"
    { id: 'fara_lactoza', label: 'Fără lactoză', iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', type: 'restriction' },
    { id: 'fara_gluten', label: 'Fără gluten', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', type: 'restriction' },
];

const stores = [
    { id: 'kaufland', name: 'Kaufland', color: '#e10915' },
    { id: 'lidl', name: 'Lidl', color: '#0050aa' },
    { id: 'penny', name: 'Penny', color: '#cd1719' },
    { id: 'mega_image', name: 'Mega Image', color: '#e31837' },
    { id: 'carrefour', name: 'Carrefour', color: '#004e9e' },
];

export default function ProfilePage() {
    const [householdSize, setHouseholdSize] = useState(2);
    const [weeklyBudget, setWeeklyBudget] = useState(300);
    const [dietaryGoal, setDietaryGoal] = useState('none');
    const [preferredStores, setPreferredStores] = useState<string[]>(['kaufland', 'lidl']);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                const profile = data.data;
                setHouseholdSize(profile.householdSize || 2);
                setWeeklyBudget(Number(profile.budgetPreference) || 300);

                // Map backend arrays to single UI selection state
                if (profile.dietaryRestrictions && profile.dietaryRestrictions.includes('FARA_GLUTEN')) {
                    setDietaryGoal('fara_gluten');
                } else if (profile.dietaryRestrictions && profile.dietaryRestrictions.includes('FARA_LACTOZA')) {
                    setDietaryGoal('fara_lactoza');
                } else if (profile.nutritionalGoals && profile.nutritionalGoals.includes('LOW_CARB')) {
                    setDietaryGoal('low_carb');
                } else if (profile.nutritionalGoals && profile.nutritionalGoals.includes('VEGETARIAN')) {
                    setDietaryGoal('vegetarian');
                } else if (profile.nutritionalGoals && profile.nutritionalGoals.includes('HIGH_PROTEIN')) {
                    setDietaryGoal('high_protein');
                } else {
                    setDietaryGoal('none');
                }

                if (profile.preferredStores) {
                    setPreferredStores(profile.preferredStores);
                }
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStore = (storeId: string) => {
        setPreferredStores(prev =>
            prev.includes(storeId)
                ? prev.filter(s => s !== storeId)
                : [...prev, storeId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        // Map UI selection to backend structure
        let nutritionalGoals: string[] = [];
        let dietaryRestrictions: string[] = [];

        switch (dietaryGoal) {
            case 'low_carb': nutritionalGoals = ['LOW_CARB']; break;
            case 'vegetarian': nutritionalGoals = ['VEGETARIAN']; break;
            case 'high_protein': nutritionalGoals = ['HIGH_PROTEIN']; break;
            case 'fara_lactoza': dietaryRestrictions = ['FARA_LACTOZA']; break;
            case 'fara_gluten': dietaryRestrictions = ['FARA_GLUTEN']; break;
            case 'budget': nutritionalGoals = ['BUDGET']; break; // Custom tag
        }

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    householdSize,
                    budgetPreference: weeklyBudget,
                    preferredStores,
                    nutritionalGoals,
                    dietaryRestrictions
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Preferințele au fost salvate!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'A apărut o eroare la salvare.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Nu s-a putut conecta la server.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-20">
            {/* Header */}
            <div className="bg-white px-4 pt-6 pb-4 border-b border-neutral-100">
                <h1 className="text-3xl font-display font-bold text-primary-600">Profilul tău</h1>
                <p className="text-neutral-500 mt-1">Personalizează-ți experiența</p>
            </div>

            <div className="px-4 py-6 space-y-6">
                {message && (
                    <div className={cn(
                        "p-4 rounded-xl text-center font-bold animate-fade-in",
                        message.type === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                        {message.text}
                    </div>
                )}

                {/* Household Size */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-soft">
                    <h3 className="font-bold text-neutral-900 mb-1">Mărimea gospodăriei</h3>
                    <p className="text-sm text-neutral-500 mb-4">Pentru câte persoane gătești de obicei?</p>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                            className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-600 hover:bg-neutral-200 transition-colors"
                        >
                            −
                        </button>
                        <div className="text-center">
                            <span className="text-4xl font-display font-bold text-primary-600">
                                {householdSize}
                            </span>
                            <p className="text-sm text-neutral-500">persoane</p>
                        </div>
                        <button
                            onClick={() => setHouseholdSize(Math.min(10, householdSize + 1))}
                            className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-2xl font-bold text-neutral-600 hover:bg-neutral-200 transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Weekly Budget */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-soft">
                    <h3 className="font-bold text-neutral-900 mb-1">Buget săptămânal</h3>
                    <p className="text-sm text-neutral-500 mb-4">Cât vrei să cheltuiești pe mâncare?</p>

                    <div className="text-center mb-4">
                        <span className="text-4xl font-display font-bold text-primary-600">
                            {weeklyBudget}
                        </span>
                        <span className="text-xl text-neutral-600 ml-1">lei</span>
                    </div>

                    <input
                        type="range"
                        min="100"
                        max="1000"
                        step="50"
                        value={weeklyBudget}
                        onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                        className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />

                    <div className="flex justify-between text-xs text-neutral-400 mt-2">
                        <span>100 lei</span>
                        <span>1000 lei</span>
                    </div>
                </div>

                {/* Dietary Goals */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-soft">
                    <h3 className="font-bold text-neutral-900 mb-1">Obiectiv alimentar</h3>
                    <p className="text-sm text-neutral-500 mb-4">Ce tip de alimentație preferi?</p>

                    <div className="grid grid-cols-2 gap-3">
                        {dietaryOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setDietaryGoal(option.id)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left",
                                    dietaryGoal === option.id
                                        ? "border-primary-500 bg-primary-50"
                                        : "border-neutral-200 hover:border-neutral-300"
                                )}
                            >
                                <svg
                                    className={cn(
                                        "w-6 h-6",
                                        dietaryGoal === option.id ? "text-primary-600" : "text-neutral-500"
                                    )}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d={option.iconPath} />
                                </svg>
                                <p className={cn(
                                    "text-sm font-semibold mt-2",
                                    dietaryGoal === option.id ? "text-primary-700" : "text-neutral-700"
                                )}>
                                    {option.label}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preferred Stores */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-soft">
                    <h3 className="font-bold text-neutral-900 mb-1">Magazine preferate</h3>
                    <p className="text-sm text-neutral-500 mb-4">Din ce magazine cumperi de obicei?</p>

                    <div className="flex flex-wrap gap-2">
                        {stores.map((store) => {
                            const isSelected = preferredStores.includes(store.id);
                            return (
                                <button
                                    key={store.id}
                                    onClick={() => toggleStore(store.id)}
                                    className={cn(
                                        "px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                                        isSelected
                                            ? "text-white shadow-md"
                                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                                    )}
                                    style={isSelected ? { backgroundColor: store.color } : undefined}
                                >
                                    {store.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-primary-700 transition-colors shadow-warm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {saving && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {saving ? 'Se salvează...' : 'Salvează preferințele'}
                </button>
            </div>
        </div>
    );
}
