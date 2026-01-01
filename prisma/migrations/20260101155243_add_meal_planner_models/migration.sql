-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "brand" TEXT,
    "price" DECIMAL NOT NULL,
    "original_price" DECIMAL,
    "discount_percentage" INTEGER,
    "unit" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "valid_from" DATETIME NOT NULL,
    "valid_until" DATETIME NOT NULL,
    "nutritional_info" TEXT,
    "allergens" TEXT,
    "source_url" TEXT,
    "catalog_page_number" INTEGER,
    "catalog_page_image" TEXT,
    "extraction_confidence" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "catalogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "pdf_local_path" TEXT,
    "valid_from" DATETIME NOT NULL,
    "valid_until" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_pages" INTEGER,
    "processed_pages" INTEGER NOT NULL DEFAULT 0,
    "processing_started_at" DATETIME,
    "processing_completed_at" DATETIME,
    "processing_errors" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "prep_time" INTEGER,
    "cook_time" INTEGER,
    "total_time" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'USOR',
    "instructions" TEXT NOT NULL,
    "tips" TEXT,
    "ingredient_ids" TEXT NOT NULL,
    "estimated_cost" DECIMAL,
    "cost_per_serving" DECIMAL,
    "total_calories" INTEGER,
    "nutrition_per_serving" TEXT,
    "slug" TEXT NOT NULL,
    "meta_description" TEXT,
    "tags" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "weekly_menus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "budget_limit" DECIMAL NOT NULL,
    "people_count" INTEGER NOT NULL DEFAULT 4,
    "preferred_stores" TEXT,
    "dietary_restrictions" TEXT,
    "menu_data" TEXT NOT NULL,
    "total_cost" DECIMAL,
    "shopping_list" TEXT,
    "slug" TEXT,
    "title" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "scraping_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "selector_config" TEXT NOT NULL,
    "scraping_frequency" TEXT NOT NULL DEFAULT 'weekly',
    "last_scraped_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "preferred_stores" TEXT,
    "dietary_restrictions" TEXT,
    "budget_preference" DECIMAL,
    "nutritional_goals" TEXT,
    "excluded_ingredients" TEXT,
    "household_size" INTEGER NOT NULL DEFAULT 2,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cache" (
    "cache_key" TEXT NOT NULL PRIMARY KEY,
    "cache_value" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shopping_carts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "session_id" TEXT,
    "store_mode" TEXT NOT NULL DEFAULT 'OPTIMAL',
    "selected_store" TEXT,
    "items" TEXT NOT NULL DEFAULT '[]',
    "total_cost" DECIMAL,
    "total_savings" DECIMAL,
    "total_with_pantry" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ingredient_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredient_name" TEXT NOT NULL,
    "category_match" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "default_unit" TEXT NOT NULL DEFAULT 'buc',
    "aisle_order" INTEGER NOT NULL DEFAULT 99,
    "aisle_name" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_pantry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "session_id" TEXT,
    "ingredient_name" TEXT NOT NULL,
    "quantity" DECIMAL,
    "unit" TEXT,
    "added_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "is_available" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_store_idx" ON "products"("store");

-- CreateIndex
CREATE INDEX "products_valid_from_valid_until_idx" ON "products"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "products_price_idx" ON "products"("price");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "catalogs_pdf_url_key" ON "catalogs"("pdf_url");

-- CreateIndex
CREATE INDEX "catalogs_store_idx" ON "catalogs"("store");

-- CreateIndex
CREATE INDEX "catalogs_status_idx" ON "catalogs"("status");

-- CreateIndex
CREATE INDEX "catalogs_valid_from_valid_until_idx" ON "catalogs"("valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_slug_idx" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipes_estimated_cost_idx" ON "recipes"("estimated_cost");

-- CreateIndex
CREATE INDEX "recipes_created_at_idx" ON "recipes"("created_at");

-- CreateIndex
CREATE INDEX "recipes_difficulty_idx" ON "recipes"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_menus_slug_key" ON "weekly_menus"("slug");

-- CreateIndex
CREATE INDEX "weekly_menus_budget_limit_idx" ON "weekly_menus"("budget_limit");

-- CreateIndex
CREATE INDEX "weekly_menus_slug_idx" ON "weekly_menus"("slug");

-- CreateIndex
CREATE INDEX "weekly_menus_created_at_idx" ON "weekly_menus"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "scraping_sources_name_key" ON "scraping_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "cache_expires_at_idx" ON "cache"("expires_at");

-- CreateIndex
CREATE INDEX "shopping_carts_user_id_idx" ON "shopping_carts"("user_id");

-- CreateIndex
CREATE INDEX "shopping_carts_session_id_idx" ON "shopping_carts"("session_id");

-- CreateIndex
CREATE INDEX "shopping_carts_created_at_idx" ON "shopping_carts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_mappings_ingredient_name_key" ON "ingredient_mappings"("ingredient_name");

-- CreateIndex
CREATE INDEX "ingredient_mappings_category_match_idx" ON "ingredient_mappings"("category_match");

-- CreateIndex
CREATE INDEX "ingredient_mappings_aisle_order_idx" ON "ingredient_mappings"("aisle_order");

-- CreateIndex
CREATE INDEX "user_pantry_user_id_idx" ON "user_pantry"("user_id");

-- CreateIndex
CREATE INDEX "user_pantry_session_id_idx" ON "user_pantry"("session_id");

-- CreateIndex
CREATE INDEX "user_pantry_ingredient_name_idx" ON "user_pantry"("ingredient_name");

-- CreateIndex
CREATE INDEX "user_pantry_is_available_idx" ON "user_pantry"("is_available");
