import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyTokenFromRequest, unauthorizedResponse } from '@/lib/admin-auth';
import { generateSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/admin/articles - Paginated list with filters
export async function GET(request: NextRequest) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const category = searchParams.get('category') || undefined;
    const published = searchParams.get('published'); // 'true', 'false', or null for all
    const search = searchParams.get('search') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (published === 'true') {
      where.published = true;
    } else if (published === 'false') {
      where.published = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          category: true,
          tags: true,
          coverImage: true,
          author: true,
          published: true,
          publishedAt: true,
          views: true,
          readingTime: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('Failed to fetch articles', error, 'ArticlesAPI');
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

// POST /api/admin/articles - Create new article
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await verifyTokenFromRequest(request);
    if (!isAuthed) return unauthorizedResponse();

    const body = await request.json();
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

    // Validate required fields
    if (!title || !excerpt || !content || !category) {
      return NextResponse.json(
        { error: 'title, excerpt, content, and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['tips', 'economie', 'retete', 'ghiduri'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate slug from title
    let slug = generateSlug(title);

    // Ensure slug uniqueness
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Estimate reading time (average 200 words per minute)
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        category,
        tags: tags || null,
        coverImage: coverImage || null,
        author: author || 'CatalogSmart',
        published: published ?? true,
        publishedAt: new Date(),
        readingTime,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
      },
    });

    logger.info(`Article created: "${title}" (${slug})`, { id: article.id, category }, 'ArticlesAPI');

    return NextResponse.json({
      success: true,
      message: 'Article created successfully',
      article,
    });
  } catch (error) {
    logger.error('Failed to create article', error, 'ArticlesAPI');
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
