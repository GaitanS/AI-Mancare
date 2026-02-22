'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { saveCartItems } from '@/lib/cart-utils';

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

// Empty ingredients - cart starts empty

export default function CartPage() {
    // Track if we've completed initialization from localStorage
    const hasLoadedFromStorage = useRef(false);
    // Track if persistCart has been called at least once (to allow legitimate clears)
    const hasPersisted = useRef(false);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [storeComparison, setStoreComparison] = useState<StoreComparison[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>('');
    const [showStoreComparison, setShowStoreComparison] = useState(false);
    // Start loading until useEffect loads cart from localStorage (avoids hydration flash)
    const [loading, setLoading] = useState(true);
    const [totalCost, setTotalCost] = useState(0);
    const [ownedItems, setOwnedItems] = useState<Set<string>>(new Set());

    // Swap modal state
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [swapIngredient, setSwapIngredient] = useState<string>('');
    const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
    const [loadingAlternatives, setLoadingAlternatives] = useState(false);

    // Flag to skip our own cart-updated events (prevent infinite loop)
    const isInternalUpdate = useRef(false);


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

    // Persist cart changes and notify other components (header badge, etc.)
    // Uses saveCartItems from cart-utils for consistent storage handling
    const persistCart = useCallback((items: CartItem[]) => {
        // Guard: never write to localStorage before we've loaded from it
        if (!hasLoadedFromStorage.current) {
            return;
        }
        hasPersisted.current = true;
        saveCartItems(items);
        isInternalUpdate.current = true;
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items } }));
        Promise.resolve().then(() => { isInternalUpdate.current = false; });
    }, []);

    // Fetch cart items on load
    const fetchCartItems = useCallback(async (storeOverride?: string, ingredientsOverride?: string[]) => {
        setLoading(true);
        try {
            // If we have an override (manual switch), use that.
            // Otherwise use current cart items names
            const ingredientList = ingredientsOverride ||
                cartItems.map(i => i.ingredientName);

            // If no ingredients, don't fetch
            if (ingredientList.length === 0) {
                setLoading(false);
                return;
            }

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
                const items = data.items || [];
                setCartItems(items);
                persistCart(items);
                setTotalCost(data.totalCost || 0);
            }
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedStore, cartItems, persistCart]);

    // Fetch store comparison
    const fetchStoreComparison = async () => {
        try {
            const currentIngredients = cartItems.map(item => item.ingredientName);

            // If no ingredients, don't fetch
            if (currentIngredients.length === 0) return;

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
            // Persist outside updater — React 19 updaters must be pure
            queueMicrotask(() => persistCart(next));
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

                // Try native sharing first (Mobile/Tablet)
                if (navigator.share && navigator.canShare && navigator.canShare({ text })) {
                    try {
                        await navigator.share({
                            title: 'Lista de Cumpărături - CatalogSmart',
                            text: text,
                        });
                        return;
                    } catch (shareError) {
                        console.warn('Share cancelled or failed, falling back to download:', shareError);
                    }
                }

                // Fallback: Create a blob and download
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

    // Function to reload cart from localStorage
    const reloadCartFromStorage = useCallback(() => {
        const savedCart = localStorage.getItem('cart_items');
        if (savedCart) {
            try {
                const parsedCart = JSON.parse(savedCart);
                setCartItems(parsedCart);
            } catch (e) {
                console.error('Failed to parse saved cart:', e);
            }
        }
    }, []);

    useEffect(() => {
        // Check for pending ingredients from meal plan flow
        const pendingIngredients = localStorage.getItem('cart_pending_ingredients');
        if (pendingIngredients) {
            try {
                const ingredients = JSON.parse(pendingIngredients);
                localStorage.removeItem('cart_pending_ingredients');
                fetchCartItems(undefined, ingredients);
            } catch (e) {
                console.error('Failed to parse pending ingredients:', e);
                setLoading(false);
            }
        } else {
            // Load cart from localStorage and stop loading spinner
            reloadCartFromStorage();
            hasLoadedFromStorage.current = true;
            setLoading(false);
        }

        fetchPantryItems();

        // Listen for cart updates from other components (e.g., ProductCard)
        const handleCartUpdate = () => {
            if (isInternalUpdate.current) return;
            reloadCartFromStorage();
        };

        window.addEventListener('cart-updated', handleCartUpdate);

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'cart_items') {
                reloadCartFromStorage();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('cart-updated', handleCartUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount - reloadCartFromStorage is stable ([] deps) and used in handlers only

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
        return sum + (item.matchedProduct?.price ?? 0) * item.requiredQuantity;
    }, 0);

    const currentTotalSavings = cartItems.reduce((sum, item) => {
        if (lowerCaseOwned.has(item.ingredientName.toLowerCase())) return sum;

        const mp = item.matchedProduct;
        if (!mp) return sum;

        let savings = 0;
        // Case 1: We have explicit original price
        if (mp.originalPrice && mp.originalPrice > mp.price) {
            savings = mp.originalPrice - mp.price;
        }
        // Case 2: We have discount % but no original price (calculate backwards)
        // savings = price * discount / (100 - discount)
        else if (mp.discount && mp.discount > 0 && mp.discount < 100) {
            savings = (mp.price * mp.discount) / (100 - mp.discount);
        }

        return sum + (savings * item.requiredQuantity);
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
        <div className="min-h-screen bg-neutral-50 pb-48 lg:pb-12">
            {/* Premium Header - Compact on Mobile */}
            <div className="relative bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-white overflow-hidden mb-4 md:mb-6">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-float" />
                    <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500 rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-float" style={{ animationDelay: '2s' }} />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />

                <div className="relative container-custom py-4 md:py-10 z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
                        <div>
                            <div className="flex items-center gap-2 md:gap-3 mb-1.5 md:mb-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-orange-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="text-white/80 text-[10px] md:text-xs font-semibold tracking-wide uppercase">Coșul Tău</span>
                            </div>
                            <h1 className="font-display text-xl md:text-4xl font-bold text-white mb-1 md:mb-2 leading-tight">
                                Lista de Cumpărături
                            </h1>
                            <p className="text-neutral-400 text-xs md:text-base max-w-lg">
                                Gestionează produsele și găsește cele mai bune oferte.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-custom">
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN - Cart Items */}
                    <div className="lg:col-span-8 space-y-4">

                        {/* Mobile Only: Banners moved to sidebar on Desktop */}
                        <div className="lg:hidden space-y-3">
                            {/* Pantry Intelligence Banner - Mobile */}
                            {ownedInCart.length > 0 && (
                                <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-3 text-white">
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

                            {/* Savings Banner - Mobile */}
                            <div className="bg-gradient-to-r from-success-500 to-success-600 rounded-xl p-3 text-white">
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
                                        <button
                                            onClick={() => {
                                                fetchStoreComparison();
                                                setShowStoreComparison(!showStoreComparison);
                                            }}
                                            className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors mb-1 touch-manipulation"
                                        >
                                            Compară
                                        </button>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <p className="font-bold text-lg">{selectedStore || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-lg font-bold text-neutral-900">Listă de cumpărături</h2>
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                                    <div className="w-20 h-20 mx-auto mb-6 bg-primary-50 rounded-full flex items-center justify-center">
                                        <svg className="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">Coșul tău este gol</h3>
                                    <p className="text-neutral-500 max-w-sm mx-auto">
                                        Adaugă rețete în planificator pentru a genera automat lista de cumpărături!
                                    </p>
                                </div>
                            ) : cartItems.map((item) => {
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
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-xs text-neutral-400">
                                                                    {item.matchedProduct?.store || 'Nedetectat'}
                                                                </p>
                                                                {item.requiredQuantity > 0 && (
                                                                    <>
                                                                        <span className="text-xs text-neutral-300">•</span>
                                                                        <p className="text-xs font-semibold text-primary-600">
                                                                            {Number(item.requiredQuantity.toFixed(2))} {item.unit}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeCartItem(item.ingredientName)}
                                                            className="p-2 -mr-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100 touch-manipulation"
                                                            title="Șterge din listă"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    {/* Price */}
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        {item.matchedProduct?.discount ? (
                                                            <span className={cn(
                                                                "text-xs line-through",
                                                                isOwned ? "text-neutral-300" : "text-neutral-400"
                                                            )}>
                                                                {item.matchedProduct.originalPrice
                                                                    ? `${(item.matchedProduct.originalPrice * item.requiredQuantity).toFixed(2)} lei`
                                                                    : `${(((item.matchedProduct.price * 100) / (100 - item.matchedProduct.discount)) * item.requiredQuantity).toFixed(2)} lei`
                                                                }
                                                            </span>
                                                        ) : null}
                                                        <span className={cn(
                                                            "font-bold text-lg leading-none",
                                                            isOwned ? "text-neutral-300" : "text-neutral-900"
                                                        )}>
                                                            {item.matchedProduct?.price ? `${(item.matchedProduct.price * item.requiredQuantity).toFixed(2)} lei` : '—'}
                                                        </span>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2">
                                                        {!isOwned && item.matchedProduct && (
                                                            <button
                                                                onClick={() => fetchAlternatives(item.ingredientName, item.matchedProduct?.price || 0)}
                                                                className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-lg transition-colors touch-manipulation"
                                                            >
                                                                Alternative
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => toggleOwned(item.ingredientName)}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border touch-manipulation",
                                                                isOwned
                                                                    ? "bg-primary-100 text-primary-700 border-primary-200"
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

                    {/* RIGHT COLUMN - Summary Sidebar (Desktop Stick) */}
                    <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">

                        {/* Summary Card */}
                        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-card">
                            <h3 className="font-display font-bold text-xl text-neutral-900 mb-6">Sumar comandă</h3>

                            {/* Savings Info */}
                            <div className="bg-success-50 border border-success-100 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-2 text-success-700 mb-1">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-bold">Total Economisit</span>
                                </div>
                                <p className="text-3xl font-display font-black text-success-600">
                                    {currentTotalSavings.toFixed(2)} <span className="text-lg">lei</span>
                                </p>
                            </div>

                            {/* Store Selector */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Magazin Selectat</label>
                                <button
                                    onClick={() => {
                                        fetchStoreComparison();
                                        setShowStoreComparison(!showStoreComparison);
                                    }}
                                    className="w-full flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedStore === cheapestStore.store && (
                                            <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                        <span className="font-bold text-neutral-900">{selectedStore || 'Selectează'}</span>
                                    </div>
                                    <span className="text-xs font-bold text-primary-600 group-hover:underline">Compară</span>
                                </button>
                            </div>

                            {/* Owned Items Info */}
                            {ownedInCart.length > 0 && (
                                <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                                    <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-bold text-amber-900">Ai economisit din cămară</p>
                                        <p className="text-xs text-amber-700 mt-0.5">
                                            Ai deja {ownedInCart.length} din ingredientele necesare.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-neutral-100 pt-4 mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-neutral-600">Total Produse</span>
                                    <span className="font-bold text-neutral-900">{cartItems.length}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-neutral-900">Total de plată</span>
                                    <span className="text-2xl font-display font-bold text-primary-600">
                                        {actualTotal.toFixed(2)} lei
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={exportList}
                                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-1"
                            >
                                Exportă lista
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Store Comparison Sheet (Modal) */}
            {showStoreComparison && (
                <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4">
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
                                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors touch-manipulation"
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

            {/* Swap Modal */}
            {swapModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4">
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
                                className="w-10 h-10 flex items-center justify-center hover:bg-neutral-100 rounded-full transition-colors touch-manipulation"
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
                                            onClick={() => {
                                                // Actually swap the matched product in the cart
                                                setCartItems(prev => {
                                                    const next = prev.map(item => {
                                                        if (item.ingredientName === swapIngredient) {
                                                            return {
                                                                ...item,
                                                                matchedProduct: {
                                                                    id: alt.id,
                                                                    name: alt.name,
                                                                    price: alt.price,
                                                                    originalPrice: alt.originalPrice,
                                                                    discount: alt.discount,
                                                                    store: alt.store,
                                                                    unit: alt.unit,
                                                                    catalogPageImage: null,
                                                                },
                                                            };
                                                        }
                                                        return item;
                                                    });
                                                    queueMicrotask(() => persistCart(next));
                                                    return next;
                                                });
                                                setSwapModalOpen(false);
                                            }}
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

            {/* Total & Checkout - Mobile Only Fixed Bottom */}
            <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-neutral-200 p-4 lg:hidden pb-4 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
        </div>
    );
}
