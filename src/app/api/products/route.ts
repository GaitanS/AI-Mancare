import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { Product, ProductFilters, PaginatedResponse, ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/products - Get products with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '24', 10), 100);
    const store = searchParams.get('store');
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const minDiscount = searchParams.get('minDiscount');
    const search = searchParams.get('search');
    const validNow = searchParams.get('validNow') !== 'false';
    const sortBy = searchParams.get('sortBy') || 'created';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * pageSize;
    const now = new Date();

    // Build where clause
    const where: any = {};

    if (validNow) {
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    }

    if (store) {
      where.store = {
        in: store.split(',').map((s: string) => s.trim()),
      };
    }

    if (category) {
      where.category = {
        in: category.split(',').map((c: string) => c.trim()),
      };
    }

    if (minPrice) {
      where.price = { ...where.price, gte: parseFloat(minPrice) };
    }

    if (maxPrice) {
      where.price = { ...where.price, lte: parseFloat(maxPrice) };
    }

    if (minDiscount) {
      where.discountPercentage = { gte: parseFloat(minDiscount) };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { category: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    switch (sortBy) {
      case 'price':
        orderBy.price = sortOrder;
        break;
      case 'discount':
        orderBy.discountPercentage = sortOrder;
        break;
      case 'name':
        orderBy.name = sortOrder;
        break;
      case 'created':
      default:
        orderBy.createdAt = sortOrder;
    }

    // Fetch data directly (cache removed for production)
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    const result = {
      products: products.map((p: any) => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        validFrom: p.validFrom.toISOString(),
        validUntil: p.validUntil.toISOString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        nutritionalInfo: p.nutritionalInfo as Product['nutritionalInfo'],
        allergens: p.allergens as string[] | null,
      })),
      total,
    };

    const response: ApiResponse<PaginatedResponse<Product>> = {
      success: true,
      data: {
        data: result.products,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch products',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/products - Create a new product (for internal use)
export async function POST(request: NextRequest) {
  try {
    // Check for API key authorization
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INTERNAL_API_KEY;

    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'category', 'price', 'unit', 'store', 'validFrom', 'validUntil'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category,
        subcategory: body.subcategory,
        brand: body.brand,
        price: body.price,
        originalPrice: body.originalPrice,
        discountPercentage: body.discountPercentage,
        unit: body.unit,
        store: body.store,
        validFrom: new Date(body.validFrom),
        validUntil: new Date(body.validUntil),
        nutritionalInfo: body.nutritionalInfo,
        allergens: body.allergens,
        sourceUrl: body.sourceUrl,
        catalogId: body.catalogId,
      },
    });

    // Cache removed for production

    const response: ApiResponse<Product> = {
      success: true,
      data: {
        ...product,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
        validFrom: product.validFrom.toISOString(),
        validUntil: product.validUntil.toISOString(),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        nutritionalInfo: product.nutritionalInfo as Product['nutritionalInfo'],
        allergens: product.allergens as string[] | null,
      },
      message: 'Product created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
