const prisma = require('../config/database');

const publicReviewSelect = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
};

const toPublicReview = (review) => ({
  id: review.id,
  rating: review.rating,
  title: review.title,
  comment: review.comment,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  reviewer: [
    review.customer.firstName,
    review.customer.lastName ? `${review.customer.lastName.charAt(0)}.` : '',
  ].filter(Boolean).join(' '),
  verifiedPurchase: true,
});

const normalizeReview = (body) => {
  const rating = Number(body.rating);
  const title = String(body.title || '').trim();
  const comment = String(body.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Choose a rating between 1 and 5 stars' };
  }
  if (title.length > 100) return { error: 'Review title must be 100 characters or fewer' };
  if (comment.length < 10 || comment.length > 1500) {
    return { error: 'Review must be between 10 and 1,500 characters' };
  }

  return { data: { rating, title: title || null, comment } };
};

const qualifyingOrder = (customerId, artworkId) => prisma.order.findFirst({
  where: {
    customerId,
    paymentStatus: 'FULLY_PAID',
    items: { some: { artworkId } },
    OR: [
      { status: 'DELIVERED' },
      { items: { some: { artworkId, artwork: { productType: 'DIGITAL' } } } },
    ],
  },
  select: { id: true },
  orderBy: { deliveredAt: 'desc' },
});

exports.listArtworkReviews = async (req, res) => {
  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const reviews = await prisma.review.findMany({
      where: { artworkId: artwork.id, isPublished: true },
      select: publicReviewSelect,
      orderBy: { createdAt: 'desc' },
    });
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter((review) => review.rating === rating).length,
    }));
    const average = reviews.length
      ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
      : 0;

    return res.json({
      reviews: reviews.map(toPublicReview),
      summary: {
        average: Number(average.toFixed(1)),
        count: reviews.length,
        distribution,
      },
    });
  } catch (error) {
    console.error('Failed to load artwork reviews:', error);
    return res.status(500).json({ error: 'Failed to load reviews' });
  }
};

exports.getEligibility = async (req, res) => {
  try {
    const [artwork, existingReview, order] = await Promise.all([
      prisma.artwork.findUnique({ where: { id: req.params.id }, select: { id: true } }),
      prisma.review.findUnique({
        where: { customerId_artworkId: { customerId: req.user.id, artworkId: req.params.id } },
        select: { id: true, rating: true, title: true, comment: true, createdAt: true, updatedAt: true },
      }),
      qualifyingOrder(req.user.id, req.params.id),
    ]);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    return res.json({
      eligible: Boolean(order || existingReview),
      hasReview: Boolean(existingReview),
      review: existingReview,
      reason: order || existingReview
        ? null
        : 'Reviews are available after digital delivery or after your physical order has been delivered.',
    });
  } catch (error) {
    console.error('Failed to check review eligibility:', error);
    return res.status(500).json({ error: 'Failed to check review eligibility' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const normalized = normalizeReview(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const existingReview = await prisma.review.findUnique({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: req.params.id } },
      select: { id: true },
    });
    if (existingReview) return res.status(409).json({ error: 'You have already reviewed this artwork' });

    const order = await qualifyingOrder(req.user.id, req.params.id);
    if (!order) {
      return res.status(403).json({
        error: 'You can review after digital delivery or after your fully paid physical order has been delivered',
      });
    }

    const review = await prisma.review.create({
      data: {
        ...normalized.data,
        customerId: req.user.id,
        artworkId: req.params.id,
        orderId: order.id,
      },
      select: publicReviewSelect,
    });
    return res.status(201).json(toPublicReview(review));
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'You have already reviewed this artwork' });
    console.error('Failed to create review:', error);
    return res.status(500).json({ error: 'Failed to publish review' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const normalized = normalizeReview(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const existingReview = await prisma.review.findFirst({
      where: {
        id: req.params.reviewId,
        artworkId: req.params.id,
        customerId: req.user.id,
      },
      select: { id: true },
    });
    if (!existingReview) return res.status(404).json({ error: 'Review not found' });

    const review = await prisma.review.update({
      where: { id: existingReview.id },
      data: normalized.data,
      select: publicReviewSelect,
    });
    return res.json(toPublicReview(review));
  } catch (error) {
    console.error('Failed to update review:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
};
