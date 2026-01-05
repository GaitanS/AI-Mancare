-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `subcategory` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `original_price` DECIMAL(65, 30) NULL,
    `discount_percentage` INTEGER NULL,
    `unit` VARCHAR(191) NOT NULL,
    `store` VARCHAR(191) NOT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `nutritional_info` TEXT NULL,
    `allergens` TEXT NULL,
    `source_url` TEXT NULL,
    `catalog_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_store_idx`(`store`),
    INDEX `products_category_idx`(`category`),
    INDEX `products_valid_from_valid_until_idx`(`valid_from`, `valid_until`),
    INDEX `products_catalog_id_idx`(`catalog_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recipes` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `image_url` TEXT NULL,
    `prep_time` INTEGER NULL,
    `cook_time` INTEGER NULL,
    `total_time` INTEGER NULL,
    `servings` INTEGER NOT NULL DEFAULT 4,
    `difficulty` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `cuisine` VARCHAR(191) NULL,
    `instructions` LONGTEXT NOT NULL,
    `tips` TEXT NULL,
    `ingredient_ids` TEXT NOT NULL,
    `estimated_cost` DECIMAL(65, 30) NULL,
    `nutrition_per_serving` TEXT NULL,
    `calories` INTEGER NULL,
    `meta_description` TEXT NULL,
    `tags` TEXT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `is_gluten_free` BOOLEAN NOT NULL DEFAULT false,
    `is_dairy_free` BOOLEAN NOT NULL DEFAULT false,
    `is_vegan` BOOLEAN NOT NULL DEFAULT false,
    `is_vegetarian` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `recipes_slug_key`(`slug`),
    INDEX `recipes_slug_idx`(`slug`),
    INDEX `recipes_cuisine_idx`(`cuisine`),
    INDEX `recipes_difficulty_idx`(`difficulty`),
    INDEX `recipes_is_published_idx`(`is_published`),
    INDEX `recipes_is_gluten_free_idx`(`is_gluten_free`),
    INDEX `recipes_is_dairy_free_idx`(`is_dairy_free`),
    INDEX `recipes_is_vegan_idx`(`is_vegan`),
    INDEX `recipes_is_vegetarian_idx`(`is_vegetarian`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weekly_menus` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `week_start` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `session_id` VARCHAR(191) NULL,
    `budget` DECIMAL(65, 30) NULL,
    `servings` INTEGER NOT NULL DEFAULT 4,
    `menu_data` LONGTEXT NOT NULL,
    `total_cost` DECIMAL(65, 30) NULL,
    `shopping_list` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `weekly_menus_user_id_idx`(`user_id`),
    INDEX `weekly_menus_session_id_idx`(`session_id`),
    INDEX `weekly_menus_week_start_idx`(`week_start`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scraping_sources` (
    `id` VARCHAR(191) NOT NULL,
    `store` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'CATALOG',
    `selector_config` TEXT NOT NULL,
    `cron_schedule` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_run_at` DATETIME(3) NULL,
    `last_run_status` VARCHAR(191) NULL,
    `last_run_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `scraping_sources_store_idx`(`store`),
    INDEX `scraping_sources_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `preferred_stores` TEXT NULL,
    `dietary_restrictions` TEXT NULL,
    `excluded_ingredients` TEXT NULL,
    `family_size` INTEGER NOT NULL DEFAULT 4,
    `weekly_budget` DECIMAL(65, 30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shopping_carts` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `session_id` VARCHAR(191) NULL,
    `items` TEXT NULL,
    `store_mode` VARCHAR(191) NOT NULL DEFAULT 'OPTIMAL',
    `total_cost` DECIMAL(65, 30) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shopping_carts_user_id_idx`(`user_id`),
    INDEX `shopping_carts_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalogs` (
    `id` VARCHAR(191) NOT NULL,
    `store` VARCHAR(191) NOT NULL,
    `pdf_url` TEXT NOT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `processing_started_at` DATETIME(3) NULL,
    `processing_completed_at` DATETIME(3) NULL,
    `processing_errors` TEXT NULL,
    `total_pages` INTEGER NULL,
    `processed_pages` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalogs_store_idx`(`store`),
    INDEX `catalogs_status_idx`(`status`),
    INDEX `catalogs_valid_from_valid_until_idx`(`valid_from`, `valid_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredient_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `ingredient_name` VARCHAR(191) NOT NULL,
    `category_match` VARCHAR(191) NOT NULL,
    `keywords` TEXT NOT NULL,
    `default_unit` VARCHAR(191) NOT NULL DEFAULT 'buc',
    `aisle_order` INTEGER NOT NULL DEFAULT 99,
    `aisle_name` VARCHAR(191) NULL,
    `is_gluten_free` BOOLEAN NOT NULL DEFAULT false,
    `is_dairy_free` BOOLEAN NOT NULL DEFAULT false,
    `is_vegan` BOOLEAN NOT NULL DEFAULT false,
    `is_vegetarian` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ingredient_mappings_ingredient_name_key`(`ingredient_name`),
    INDEX `ingredient_mappings_category_match_idx`(`category_match`),
    INDEX `ingredient_mappings_aisle_order_idx`(`aisle_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_pantry` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `session_id` VARCHAR(191) NULL,
    `ingredient_name` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(65, 30) NULL,
    `unit` VARCHAR(191) NULL,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT true,

    INDEX `user_pantry_user_id_idx`(`user_id`),
    INDEX `user_pantry_session_id_idx`(`session_id`),
    INDEX `user_pantry_ingredient_name_idx`(`ingredient_name`),
    INDEX `user_pantry_is_available_idx`(`is_available`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
