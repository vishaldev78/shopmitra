import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await ctx.params;
    const user = await getSessionUser();
    const [reviews, ownReview, eligibleToReview] = await Promise.all([
      db.review.findMany({
        where: { productId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      user ? db.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } }) : null,
      user?.role === 'customer'
        ? db.orderItem.findFirst({
            where: { productId, order: { userId: user.id, status: 'delivered' } },
            select: { id: true },
          })
        : null,
    ]);

    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.user.name,
        created_at: review.createdAt.toISOString(),
      })),
      own_review: ownReview ? { rating: ownReview.rating, comment: ownReview.comment } : null,
      eligible_to_review: Boolean(eligibleToReview),
    });
  } catch (error) {
    console.error('product reviews GET error:', error);
    return NextResponse.json({ error: 'Failed to load product reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'customer') {
    return NextResponse.json({ error: 'Sign in with a shopper account to leave a review' }, { status: 403 });
  }

  try {
    const { id: productId } = await ctx.params;
    const parsed = reviewSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Choose a rating from 1 to 5 stars' }, { status: 400 });
    }

    const deliveredPurchase = await db.orderItem.findFirst({
      where: {
        productId,
        order: { userId: user.id, status: 'delivered' },
      },
      select: { id: true },
    });
    if (!deliveredPurchase) {
      return NextResponse.json({ error: 'You can review this product after your order is delivered' }, { status: 403 });
    }

    const result = await db.$transaction(async (tx) => {
      const savedReview = await tx.review.upsert({
        where: { productId_userId: { productId, userId: user.id } },
        create: { productId, userId: user.id, rating: parsed.data.rating, comment: parsed.data.comment },
        update: { rating: parsed.data.rating, comment: parsed.data.comment },
        include: { user: { select: { name: true } } },
      });

      const aggregate = await tx.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      const rating = Math.round((aggregate._avg.rating ?? 0) * 10) / 10;
      const reviewCount = aggregate._count._all;
      await tx.product.update({ where: { id: productId }, data: { rating, reviewCount } });
      return {
        rating,
        reviewCount,
        review: {
          id: savedReview.id,
          rating: savedReview.rating,
          comment: savedReview.comment,
          reviewer_name: savedReview.user.name,
          created_at: savedReview.createdAt.toISOString(),
        },
      };
    });

    return NextResponse.json({
      success: true,
      own_review: parsed.data,
      ...result,
    });
  } catch (error) {
    console.error('product reviews POST error:', error);
    return NextResponse.json({ error: 'Failed to save your review' }, { status: 500 });
  }
}
