'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AddToPlanModalProps {
    recipe: {
        id: string;
        title: string;
        imageUrl: string | null;
        servings: number;
        estimatedCost: number | null;
    };
    onConfirm: (recipeId: string, portions: number, day: string | null) => void;
    onClose: () => void;
}

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export default function AddToPlanModal({ recipe, onConfirm, onClose }: AddToPlanModalProps) {
    const [portions, setPortions] = useState(recipe.servings || 4);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const scaledCost = recipe.estimatedCost && recipe.servings > 0
        ? Math.round((recipe.estimatedCost * portions / recipe.servings) * 100) / 100
        : null;

    const handleConfirm = () => {
        onConfirm(recipe.id, portions, selectedDay);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header with Image */}
                <div className="relative h-32 bg-neutral-100">
                    {recipe.imageUrl ? (
                        <Image
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-16 h-16 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <h2 className="absolute bottom-3 left-4 right-4 font-display font-bold text-xl text-white line-clamp-2">
                        {recipe.title}
                    </h2>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors touch-manipulation"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Portions Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-neutral-700 mb-3">
                            Pentru câte persoane?
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setPortions(Math.max(1, portions - 1))}
                                className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>

                            <div className="flex-1 text-center">
                                <span className="text-4xl font-bold text-neutral-900">{portions}</span>
                                <span className="block text-sm text-neutral-500 mt-1">
                                    {portions === 1 ? 'persoană' : 'persoane'}
                                </span>
                            </div>

                            <button
                                onClick={() => setPortions(Math.min(20, portions + 1))}
                                className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="flex justify-center gap-2 mt-3">
                            {[2, 4, 6, 8].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setPortions(num)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors touch-manipulation ${portions === num
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Day Selection (Optional) */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-neutral-700 mb-3">
                            Pentru ce zi? <span className="font-normal text-neutral-400">(opțional)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation ${selectedDay === day
                                            ? 'bg-primary-600 text-white shadow-md'
                                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cost Estimate */}
                    {scaledCost && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-700">Cost estimat ingrediente</span>
                                <span className="text-lg font-bold text-emerald-800">{scaledCost} RON</span>
                            </div>
                        </div>
                    )}

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Adaugă în plan
                    </button>
                </div>
            </div>
        </div>
    );
}
