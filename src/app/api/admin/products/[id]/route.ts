import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAudit, computeChanges } from '@/lib/audit-logger';
import { verifyRequestOrigin } from '@/lib/admin-auth';

// GET /api/admin/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// PUT /api/admin/products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const fields = ['name', 'category', 'subcategory', 'brand', 'price', 'originalPrice', 'discountPercentage', 'unit', 'store'];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle price as Decimal
    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }
    if (updateData.originalPrice !== undefined) {
      updateData.originalPrice = updateData.originalPrice ? Number(updateData.originalPrice) : null;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    const changes = computeChanges(
      existing as unknown as Record<string, unknown>,
      body,
      fields
    );

    await logAudit({
      action: 'UPDATE',
      entity: 'product',
      entityId: id,
      changes: changes || undefined,
      details: `Updated product: ${product.name}`,
      request,
    });

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF protection
  if (!verifyRequestOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    await logAudit({
      action: 'DELETE',
      entity: 'product',
      entityId: id,
      details: `Deleted product: ${existing.name}`,
      request,
    });

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
