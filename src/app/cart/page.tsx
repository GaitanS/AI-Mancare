'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface MatchedProduct {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    discount: number | null;
    store: string;
    unit: string;
    catalogPageImage: string | null;
}

interface CartItem {
    ingredientName: string;
    requiredQuantity: number;
    unit: string;
    matchedProduct: MatchedProduct | null;
    alternatives: Array<{
        id: string;
        name: string;
        price: number;
        store: string;
        savings: number;
    }>;
    ownedByUser: boolean;
}

interface StoreComparison {
    store: string;
    total: number;
    savings: number;
    availableItems: number;
}

interface AlternativeProduct {
    id: string;
    name: string;
    price: number;
    originalPrice: number | null;
    discount: number | null;
    store: string;
    savings: number;
    unit: string;
}

// Demo ingredients for testing
const demoIngredients = ['pui', 'roșii', 'ceapă', 'smântână', 'cartofi', 'usturoi'];

export default function CartPage() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [storeComparison, setStoreComparison] = useState<StoreComparison[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [showStoreComparison, setShowStoreComparison] = useState(false);
    const [loading, setLoading] = useState(true);
    const [totalCost, setTotalCost] = useState(0);
    const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());

    // Swap modal state
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [swapIngredient, setSwapIngredient] = useState<string>('');
    const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
    const [loadingAlternatives, setLoadingAlternatives] = useState(false);

    // Session ID for anonymous users
    const [sessionId] = useState(() => {
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem('cart_session_id');
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem('cart_session_id', id);
            }
            return id;
        }
        return '';
    });

    // Fetch cart items on load
    const fetchCartItems = useCallback(async (storeOverride?: string, ingredientsOverride?: string[]) => {
        setLoading(true);
        try {
            // If we have an override (manual switch), use that. 
            // Otherwise try to use current cart items names, or fallback to demo only if cart is empty.
            const ingredientList = ingredientsOverride ||
                (cartItems.length > 0 ? cartItems.map(i => i.ingredientName) : demoIngredients);

            const response = await fetch('/api/cart/auto-fill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredients: ingredientList,
                    store: storeOverride || selectedStore
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setCartItems(data.items || []);
                setTotalCost(data.totalCost || 0);
            }
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedStore, cartItems]);

    // Fetch store comparison
    const fetchStoreComparison = async () => {
        try {
            const currentIngredients = cartItems.length > 0
                ? cartItems.map(item => item.ingredientName)
                : demoIngredients;

            const response = await fetch('/api/cart/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredients: currentIngredients }),
            });

            if (response.ok) {
                const data = await response.json();
                setStoreComparison(data.comparison || []);
                if (data.recommended) {
                    setSelectedStore(data.recommended);
                }
            }
        } catch (error) {
            console.error('Failed to fetch store comparison:', error);
        }
    };

    // Fetch pantry items
    const fetchPantryItems = async () => {
        try {
            const response = await fetch(`/api/pantry?sessionId=${sessionId}`);
            if (response.ok) {
                const data = await response.json();
                const owned = new Set<string>(data.items.map((item: { ingredientName: string }) => item.ingredientName));
                setOwnedItems(owned);
            }
        } catch (error) {
            console.error('Failed to fetch pantry:', error);
        }
    };

    // Toggle pantry ownership
    const toggleOwned = async (ingredientName: string) => {
        const normalized = ingredientName.toLowerCase();
        const newOwned = !ownedItems.has(normalized);

        try {
            await fetch('/api/pantry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredientName: normalized,
                    owned: newOwned,
                    sessionId,
                }),
            });

            setOwnedItems(prev => {
                const next = new Set(prev);
                if (newOwned) {
                    next.add(normalized);
                } else {
                    next.delete(normalized);
                }
                return next;
            });
        } catch (error) {
            console.error('Failed to toggle pantry:', error);
        }
    };

    const removeCartItem = (ingredientName: string) => {
        setCartItems(prev => {
            const next = prev.filter(item => item.ingredientName !== ingredientName);
            // Re-calculate store comparison if needed or just clear it to force refresh
            if (showStoreComparison) fetchStoreComparison();
            return next;
        });
    };

    // Fetch alternatives for swap
    const fetchAlternatives = async (ingredientName: string, currentPrice: number) => {
        setLoadingAlternatives(true);
        setSwapIngredient(ingredientName);
        setSwapModalOpen(true);

        try {
            const response = await fetch(
                `/api/cart/alternatives?ingredientName=${encodeURIComponent(ingredientName)}&currentPrice=${currentPrice}`
            );

            if (response.ok) {
                const data = await response.json();
                setAlternatives(data.alternatives || []);
            }
        } catch (error) {
            console.error('Failed to fetch alternatives:', error);
        } finally {
            setLoadingAlternatives(false);
        }
    };

    // Export shopping list
    const exportList = async () => {
        try {
            const currentIngredients = cartItems.map(item => item.ingredientName);
            const response = await fetch(
                `/api/cart/export?format=text&ingredients=${currentIngredients.join(',')}&store=${selectedStore}`
            );

            if (response.ok) {
                const text = await response.text();
                // Create a blob and download
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'lista-cumparaturi.txt';
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export list:', error);
        }
    };

    useEffect(() => {
        // Initial load with demo ingredients
        fetchCartItems(undefined, demoIngredients);
        fetchStoreComparison();
        fetchPantryItems();
    }, []); // Only on mount

    // Lock body scroll when modal is open
    useEffect(() => {
        if (swapModalOpen || showStoreComparison) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [swapModalOpen, showStoreComparison]);

    // Calculate totals and counts considering owned items and filtered cart
    const lowerCaseOwned = new Set(Array.from(ownedItems).map(i => i.toLowerCase()));
    const cartIngredients = cartItems.map(item => item.ingredientName.toLowerCase());
    const ownedInCart = cartIngredients.filter(name => lowerCaseOwned.has(name));

    const actualTotal = cartItems.reduce((sum, item) => {
        if (lowerCaseOwned.has(item.ingredientName.toLowerCase())) return sum;
        return sum + (item.matchedProduct?.price || 0);
    }, 0);

    const currentTotalSavings = cartItems.reduce((sum, item) => {
        if (lowerCaseOwned.has(item.ingredientName.toLowerCase())) return sum;
        const savings = (item.matchedProduct?.originalPrice || 0) - (item.matchedProduct?.price || 0);
        return sum + (savings > 0 ? savings : 0);
    }, 0);

    const cheapestStore = storeComparison.length > 0
        ? storeComparison.reduce((prev, curr) => curr.total < prev.total ? curr : prev)
        : { store: '', total: actualTotal, savings: currentTotalSavings };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-neutral-600">Se încarcă coșul...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Header */}
            <div className="bg-white px-4 pt-6 pb-4 border-b border-neutral-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-primary-600">Coșul tău</h1>
                        <p className="text-neutral-500 mt-1">{cartItems.length} ingrediente</p>
                    </div>
                    <button
                        onClick={() => {
                            fetchStoreComparison();
                            setShowStoreComparison(!showStoreComparison);
                        }}
                        className="px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-semibold"
                    >
                        Compară magazine
                    </button>
                </div>
            </div>

            {/* Store Comparison Sheet (Modal) */}
            {showStoreComparison && (
                <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowStoreComparison(false)}
                    />
                    <div className="relative bg-white w-full max-w-lg rounded-t-3xl lg:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-neutral-900 text-lg">Unde este mai ieftin?</h3>
                                <p className="text-sm text-neutral-500">Prețul total al coșului pe magazine</p>
                            </div>
                            <button
                                onClick={() => setShowStoreComparison(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                            <div className="space-y-3 pb-safe">
                                {storeComparison.map((store) => (
                                    <button
                                        key={store.store}
                                        onClick={() => {
                                            const currentNames = cartItems.map(i => i.ingredientName);
                                            setSelectedStore(store.store);
                                            fetchCartItems(store.store, currentNames);
                                            setShowStoreComparison(false);
                                        }}
                                        className={cn(
                                            "w-full p-4 rounded-2xl flex items-center justify-between transition-all border",
                                            selectedStore === store.store
                                                ? "bg-primary-50 border-primary-200 shadow-md ring-2 ring-primary-500 ring-offset-1"
                                                : "bg-neutral-50 border-transparent hover:border-neutral-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {selectedStore === store.store && (
                                                <div className="bg-primary-600 text-white rounded-full p-0.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                            {store.store === cheapestStore.store && (
                                                <span className="px-2 py-1 bg-success-100 text-success-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                                    Optim
                                                </span>
                                            )}
                                            <span className="font-bold text-neutral-900">{store.store}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg text-neutral-900">{store.total.toFixed(2)} lei</p>
                                            <div className="flex flex-col items-end">
                                                <p className="text-xs text-neutral-500">
                                                    {store.availableItems} din {cartItems.length} produse
                                                </p>
                                                {store.savings > 0 && (
                                                    <p className="text-[10px] text-success-600 font-bold">
                                                        -{store.savings.toFixed(2)} lei economie
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pantry Intelligence Banner */}
            {ownedInCart.length > 0 && (
                <div className="mx-4 mt-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-3 text-white">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <p className="font-bold text-sm">Ai deja {ownedInCart.length} ingrediente acasă!</p>
                    </div>
                    <p className="text-xs text-amber-100">
                        Total real de plată: <span className="font-bold text-lg">{actualTotal.toFixed(2)} lei</span>
                    </p>
                </div>
            )}

            {/* Savings Banner */}
            <div className="mx-4 mt-3 bg-gradient-to-r from-success-500 to-success-600 rounded-xl p-3 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="font-bold text-sm">Economisești</p>
                        </div>
                        <p className="text-2xl font-display font-black">
                            {currentTotalSavings.toFixed(2)} lei
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-success-100 opacity-80 uppercase tracking-wider font-bold">
                            {selectedStore === cheapestStore.store ? 'Magazin recomandat' : 'Magazin selectat'}
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                            {selectedStore === cheapestStore.store && (
                                <svg className="w-4 h-4 text-success-200" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                            <p className="font-bold text-lg">{selectedStore || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cart Items */}
            <div className="px-4 mt-6">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">Ingrediente</h2>

                <div className="space-y-3">
                    {cartItems.map((item) => {
                        const isOwned = ownedItems.has(item.ingredientName.toLowerCase());

                        return (
                            <div
                                key={item.ingredientName}
                                className={cn(
                                    "bg-white rounded-2xl p-4 border shadow-soft transition-all group",
                                    isOwned ? "border-success-200 bg-success-50/30" : "border-neutral-100"
                                )}
                            >
                                <div className="flex gap-4">
                                    {/* Product Image */}
                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-neutral-100">
                                        {item.matchedProduct?.catalogPageImage ? (
                                            <Image
                                                src={item.matchedProduct.catalogPageImage}
                                                alt={item.matchedProduct.name}
                                                fill
                                                className={cn("object-cover transition-opacity", isOwned ? "opacity-50 grayscale" : "opacity-100")}
                                                sizes="80px"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-primary-600">
                                                    {item.ingredientName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Discount Badge */}
                                        {!isOwned && item.matchedProduct?.discount && (
                                            <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                                -{item.matchedProduct.discount}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className={cn(
                                                        "font-bold text-sm line-clamp-2 transition-colors",
                                                        isOwned ? "text-neutral-400 line-through decoration-2 decoration-neutral-300" : "text-neutral-900"
                                                    )}>
                                                        {item.matchedProduct?.name || item.ingredientName}
                                                    </h3>
                                                    <p className="text-xs text-neutral-400 mt-0.5">
                                                        {item.matchedProduct?.store || 'Nedetectat'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => removeCartItem(item.ingredientName)}
                                                    className="p-1.5 -mr-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Șterge din listă"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            {/* Price */}
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "font-bold text-lg",
                                                    isOwned ? "text-neutral-300" : "text-neutral-900"
                                                )}>
                                                    {item.matchedProduct?.price ? `${item.matchedProduct.price.toFixed(2)} lei` : '—'}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {!isOwned && item.matchedProduct && (
                                                    <button
                                                        onClick={() => fetchAlternatives(item.ingredientName, item.matchedProduct?.price || 0)}
                                                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Alternative
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => toggleOwned(item.ingredientName)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                                        isOwned
                                                            ? "bg-success-100 text-success-700 border-success-200"
                                                            : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                                                    )}
                                                >
                                                    {isOwned ? (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Cumpărat
                                                        </>
                                                    ) : (
                                                        <span className="text-neutral-600">Bifează</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Swap Modal */}
            {swapModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSwapModalOpen(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white w-full max-w-lg rounded-t-3xl lg:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h3 className="font-bold text-neutral-900">Alternative pentru {swapIngredient}</h3>
                                <p className="text-sm text-neutral-500">Alege o opțiune mai ieftină</p>
                            </div>
                            <button
                                onClick={() => setSwapModalOpen(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                            {loadingAlternatives ? (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : alternatives.length > 0 ? (
                                <div className="space-y-3 pb-safe">
                                    {alternatives.map((alt) => (
                                        <button
                                            key={alt.id}
                                            onClick={() => setSwapModalOpen(false)}
                                            className="w-full p-4 bg-neutral-50 hover:bg-primary-50 rounded-xl text-left transition-colors border border-transparent hover:border-primary-100"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-neutral-900">{alt.name}</p>
                                                    <p className="text-sm text-neutral-500">{alt.store}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg text-primary-600">{alt.price.toFixed(2)} lei</p>
                                                    {alt.savings > 0 && (
                                                        <p className="text-sm text-success-600 font-semibold">
                                                            Economisești {alt.savings.toFixed(2)} lei
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-neutral-500 py-8">Nu s-au găsit alternative</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Total & Checkout */}
            <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-neutral-200 p-4 lg:hidden">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-neutral-600">Total de plată</span>
                    <span className="text-2xl font-display font-bold text-neutral-900">
                        {actualTotal.toFixed(2)} lei
                    </span>
                </div>
                <button
                    onClick={exportList}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-700 transition-colors shadow-warm"
                >
                    Exportă lista de cumpărături
                </button>
            </div>

            {/* Spacer */}
            <div className="h-40" />
        </div>
    );
}
