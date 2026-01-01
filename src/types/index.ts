// Type Definitions pentru Retete Ieftine

import { Decimal } from '@prisma/client/runtime/library';

// ==========================================
// PRODUCT TYPES
// ==========================================
export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  unit: string;
  store: string;
  validFrom: Date | string;
  validUntil: Date | string;
  nutritionalInfo?: NutritionalInfo | null;
  allergens?: string[] | null;
  sourceUrl?: string | null;
  catalogPageNumber?: number | null;
  catalogPageImage?: string | null;  // Path to catalog page screenshot
  extractionConfidence?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface ExtractedProduct {
  name: string;
  brand?: string | null;
  price: number;
  unit: string;
  original_price?: number | null;
  discount_percentage?: number | null;
  category: string;
  subcategory?: string;
  extraction_confidence: number;
  nutritionalInfo?: NutritionalInfo;
  allergens?: string[];
}

// ==========================================
// CATALOG TYPES
// ==========================================
export interface Catalog {
  id: string;
  store: string;
  title: string;
  pdfUrl: string;
  pdfLocalPath?: string | null;
  validFrom: Date;
  validUntil: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalPages?: number | null;
  processedPages: number;
  processingStartedAt?: Date | null;
  processingCompletedAt?: Date | null;
  processingErrors?: any;
  createdAt: Date;
}

export interface ScrapedCatalog {
  store: string;
  title: string;
  pdfUrl: string;
  validPeriod: string;
}

// ==========================================
// RECIPE TYPES
// ==========================================
export interface Recipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  difficulty: 'USOR' | 'MEDIU' | 'DIFICIL';
  instructions: RecipeStep[];
  tips?: string[] | null;
  ingredientIds: string[];
  estimatedCost?: number | null;
  costPerServing?: number | null;
  totalCalories?: number | null;
  nutritionPerServing?: NutritionalInfo | null;
  slug: string;
  metaDescription?: string | null;
  tags?: string[] | null;
  viewCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeStep {
  step: number;
  text: string;
}

export interface RecipeIngredient {
  product_id: string;
  quantity: string;
  notes?: string;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  servings: number;
  prep_time: number;
  cook_time: number;
  difficulty: 'ușor' | 'mediu' | 'dificil';
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  tips: string[];
  estimated_cost: number;
}

// ==========================================
// MENU TYPES
// ==========================================
export interface WeeklyMenu {
  id: string;
  userId?: string | null;
  budgetLimit: number;
  peopleCount: number;
  preferredStores?: string[] | null;
  dietaryRestrictions?: string[] | null;
  menuData: MenuData;
  totalCost?: number | null;
  shoppingList?: ShoppingListItem[] | null;
  slug?: string | null;
  title?: string | null;
  createdAt: Date;
}

export interface MenuData {
  days: DayMenu[];
}

export interface DayMenu {
  day: string;
  meals: {
    breakfast?: string; // recipe ID
    lunch?: string;
    dinner?: string;
  };
}

export interface ShoppingListItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  store: string;
  price: number;
}

// ==========================================
// SCRAPING TYPES
// ==========================================
export interface ScrapingSource {
  id: string;
  name: string;
  baseUrl: string;
  selectorConfig: SelectorConfig;
  scrapingFrequency: string;
  lastScrapedAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface SelectorConfig {
  catalogContainer: string;
  catalogItem: string;
  storeName: string;
  catalogTitle?: string;
  pdfLink?: string;
  validDates?: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// FILTER TYPES
// ==========================================
export interface ProductFilters {
  store?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  validNow?: boolean;
  search?: string;
  sortBy?: 'price' | 'discount' | 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface RecipeFilters {
  difficulty?: 'USOR' | 'MEDIU' | 'DIFICIL';
  maxCost?: number;
  maxTime?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'cost' | 'time' | 'views' | 'created';
  sortOrder?: 'asc' | 'desc';
}

// ==========================================
// UTILITY TYPES
// ==========================================
export interface DateRange {
  start: Date;
  end: Date;
}

export interface ProcessingResult {
  success: boolean;
  catalogId: string;
  productsExtracted: number;
  errors?: string[];
  processingTime: number;
}
