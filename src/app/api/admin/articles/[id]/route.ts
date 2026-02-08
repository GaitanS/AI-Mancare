import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyTokenFromRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { generateSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/admin/articles/[id] - Get single article with full content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) return unauthorizedResponse();

    const { id } = await params;

    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    logger.error('Failed to fetch article', error, 'ArticlesAPI');
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/articles/[id] - Update article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) return unauthorizedResponse();

    const { id } = await params;
    const body = await request.json();

    // Verify article exists
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const {
      title,
      excerpt,
      content,
      category,
      tags,
      coverImage,
      author,
      published,
      metaTitle,
      metaDescription,
    } = body;

    // Validate category if provided
    if (category) {
      const validCategories = ['tips', 'economie', 'retete', 'ghiduri'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `category must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Build update data - only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title;
      // Re-generate slug if title changed and it's different from existing
      if (title !== existing.title) {
        let newSlug = generateSlug(title);
        const slugConflict = await prisma.article.findFirst({
          where: { slug: newSlug, id: { not: id } },
        });
        if (slugConflict) {
          newSlug = `${newSlug}-${Date.now().toString(36)}`;
        }
        updateData.slug = newSlug;
      }
    }

    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage || null;
    if (author !== undefined) updateData.author = author;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle || null;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription || null;

    if (content !== undefined) {
      updateData.content = content;
      // Recalculate reading time when content changes
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
      updateData.readingTime = Math.max(1, Math.ceil(wordCount / 200));
    }

    if (published !== undefined) {
      updateData.published = published;
      // Set publishedAt when first publishing
      if (published && !existing.published) {
        updateData.publishedAt = new Date();
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Article updated: "${article.title}" (${article.slug})`, { id, fields: Object.keys(updateData) }, 'ArticlesAPI');

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article,
    });
  } catch (error) {
    logger.error('Failed to update article', error, 'ArticlesAPI');
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/articles/[id] - Delete article
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) return unauthorizedResponse();

    const { id } = await params;

    // Verify article exists
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    await prisma.article.delete({ where: { id } });

    logger.info(`Article deleted: "${existing.title}" (${existing.slug})`, { id }, 'ArticlesAPI');

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete article', error, 'ArticlesAPI');
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
