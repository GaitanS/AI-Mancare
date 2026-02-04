// Cart utilities for adding/removing products

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  discount: number | null;
  store: string;
  unit: string;
  catalogPageImage: string | null;
}

export interface CartItem {
  ingredientName: string;
  requiredQuantity: number;
  unit: string;
  matchedProduct: CartProduct | null;
  alternatives: Array<{
    id: string;
    name: string;
    price: number;
    store: string;
    savings: number;
  }>;
  ownedByUser: boolean;
}

const CART_STORAGE_KEY = 'cart_items';

export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse cart:', e);
  }
  return [];
}

export function saveCartItems(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function addProductToCart(product: {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  store: string;
  unit: string;
  imageUrl?: string | null;
}): boolean {
  const currentItems = getCartItems();

  // Check if product already exists (by name, case-insensitive)
  const existingIndex = currentItems.findIndex(
    item => item.ingredientName.toLowerCase() === product.name.toLowerCase()
  );

  if (existingIndex !== -1) {
    // Update quantity
    currentItems[existingIndex].requiredQuantity += 1;
    saveCartItems(currentItems);
    // Dispatch event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: currentItems } }));
    }
    return true;
  }

  // Add new item
  const newItem: CartItem = {
    ingredientName: product.name,
    requiredQuantity: 1,
    unit: product.unit,
    matchedProduct: {
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || null,
      discount: product.discountPercentage || null,
      store: product.store,
      unit: product.unit,
      catalogPageImage: product.imageUrl || null,
    },
    alternatives: [],
    ownedByUser: false,
  };

  currentItems.push(newItem);
  saveCartItems(currentItems);

  // Dispatch custom event for UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: currentItems } }));
  }

  return true;
}

export function removeProductFromCart(ingredientName: string): boolean {
  const currentItems = getCartItems();
  const filtered = currentItems.filter(
    item => item.ingredientName.toLowerCase() !== ingredientName.toLowerCase()
  );

  if (filtered.length !== currentItems.length) {
    saveCartItems(filtered);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: filtered } }));
    }
    return true;
  }

  return false;
}

export function isProductInCart(productName: string): boolean {
  const items = getCartItems();
  return items.some(
    item => item.ingredientName.toLowerCase() === productName.toLowerCase()
  );
}

export function getCartCount(): number {
  return getCartItems().length;
}
