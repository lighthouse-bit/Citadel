const prisma = require('../config/database');

const artworkInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 2 },
  _count: { select: { wishlistItems: true, orderItems: true } },
};

const popularity = artwork => artwork._count.wishlistItems * 2 + artwork._count.orderItems * 4;

exports.getFacets = async (req, res) => {
  try {
    const where = { status: { notIn: ['DRAFT', 'ARCHIVED'] } };
    const [mediums, price, years] = await Promise.all([
      prisma.artwork.findMany({ where: { ...where, medium: { not: null } }, distinct: ['medium'], select: { medium: true }, orderBy: { medium: 'asc' } }),
      prisma.artwork.aggregate({ where, _min: { price: true }, _max: { price: true } }),
      prisma.artwork.aggregate({ where, _min: { year: true }, _max: { year: true } }),
    ]);
    res.json({
      mediums: mediums.map(item => item.medium).filter(Boolean),
      price: { min: Number(price._min.price || 0), max: Number(price._max.price || 0) },
      years: { min: years._min.year, max: years._max.year },
    });
  } catch (error) {
    console.error('Failed to load discovery facets:', error);
    res.status(500).json({ error: 'Failed to load filters' });
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 80);
    if (query.length < 2) return res.json([]);
    const artworks = await prisma.artwork.findMany({
      where: {
        status: { notIn: ['DRAFT', 'ARCHIVED'] },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { medium: { contains: query, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      select: { id: true, title: true, medium: true, category: true, status: true, images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } } },
      orderBy: { title: 'asc' },
      take: 8,
    });
    res.json(artworks);
  } catch (error) {
    console.error('Failed to load search suggestions:', error);
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
};

exports.recordView = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') return res.status(204).send();
    const artwork = await prisma.artwork.findFirst({ where: { id: req.params.id, status: { notIn: ['DRAFT', 'ARCHIVED'] } }, select: { id: true } });
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    await prisma.customerArtworkView.upsert({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } },
      create: { customerId: req.user.id, artworkId: artwork.id },
      update: { viewedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to record artwork view:', error);
    res.status(204).send();
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const views = await prisma.customerArtworkView.findMany({
      where: { customerId: req.user.id, artwork: { status: { notIn: ['DRAFT', 'ARCHIVED'] } } },
      include: { artwork: { include: artworkInclude } },
      orderBy: { viewedAt: 'desc' },
      take: 12,
    });
    res.json(views.map(view => ({ ...view.artwork, viewedAt: view.viewedAt })));
  } catch (error) {
    console.error('Failed to load recently viewed artwork:', error);
    res.status(500).json({ error: 'Failed to load recently viewed artwork' });
  }
};

exports.getRelated = async (req, res) => {
  try {
    const source = await prisma.artwork.findUnique({ where: { id: req.params.id } });
    if (!source) return res.status(404).json({ error: 'Artwork not found' });
    const candidates = await prisma.artwork.findMany({
      where: { id: { not: source.id }, status: 'AVAILABLE', OR: [{ category: source.category }, ...(source.medium ? [{ medium: { equals: source.medium, mode: 'insensitive' } }] : [])] },
      include: artworkInclude,
      take: 30,
    });
    if (candidates.length < 6) {
      const fallback = await prisma.artwork.findMany({
        where: { id: { notIn: [source.id, ...candidates.map(artwork => artwork.id)] }, status: 'AVAILABLE' },
        include: artworkInclude,
        orderBy: [{ wishlistItems: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 6 - candidates.length,
      });
      candidates.push(...fallback);
    }
    const sourcePrice = Number(source.price);
    const ranked = candidates.map(artwork => {
      let score = popularity(artwork);
      if (artwork.category === source.category) score += 12;
      if (source.medium && artwork.medium?.toLowerCase() === source.medium.toLowerCase()) score += 8;
      if (sourcePrice && Math.abs(Number(artwork.price) - sourcePrice) / sourcePrice <= 0.3) score += 4;
      if (source.width && source.height && artwork.width && artwork.height) {
        const sourceArea = Number(source.width) * Number(source.height);
        const area = Number(artwork.width) * Number(artwork.height);
        if (Math.abs(area - sourceArea) / sourceArea <= 0.35) score += 3;
      }
      return { ...artwork, recommendationScore: score };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 6);
    res.json(ranked);
  } catch (error) {
    console.error('Failed to load related artwork:', error);
    res.status(500).json({ error: 'Failed to load related artwork' });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const isCustomer = req.user?.role === 'customer';
    const signals = isCustomer ? await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: {
        wishlistItems: { select: { artwork: { select: { id: true, category: true, medium: true } } }, take: 30 },
        cartItems: { select: { artwork: { select: { id: true, category: true, medium: true } } }, take: 20 },
        artworkViews: { select: { artwork: { select: { id: true, category: true, medium: true } } }, orderBy: { viewedAt: 'desc' }, take: 30 },
        orders: { where: { paymentStatus: 'FULLY_PAID' }, select: { items: { select: { artwork: { select: { id: true, category: true, medium: true } } } } }, take: 20 },
      },
    }) : null;

    const categoryWeights = new Map();
    const mediumWeights = new Map();
    const purchasedIds = new Set();
    const addSignal = (artwork, weight) => {
      categoryWeights.set(artwork.category, (categoryWeights.get(artwork.category) || 0) + weight);
      if (artwork.medium) mediumWeights.set(artwork.medium.toLowerCase(), (mediumWeights.get(artwork.medium.toLowerCase()) || 0) + weight);
    };
    signals?.wishlistItems.forEach(item => addSignal(item.artwork, 4));
    signals?.cartItems.forEach(item => addSignal(item.artwork, 5));
    signals?.artworkViews.forEach(item => addSignal(item.artwork, 2));
    signals?.orders.forEach(order => order.items.forEach(item => { addSignal(item.artwork, 7); purchasedIds.add(item.artwork.id); }));

    const candidates = await prisma.artwork.findMany({ where: { status: 'AVAILABLE', ...(purchasedIds.size && { id: { notIn: [...purchasedIds] } }) }, include: artworkInclude, take: 100 });
    const recommendations = candidates.map(artwork => {
      const categoryScore = categoryWeights.get(artwork.category) || 0;
      const mediumScore = artwork.medium ? mediumWeights.get(artwork.medium.toLowerCase()) || 0 : 0;
      const signalScore = categoryScore + mediumScore;
      return {
        ...artwork,
        recommendationScore: signalScore + popularity(artwork),
        recommendationReason: signalScore ? (mediumScore >= categoryScore ? `Because you explored ${artwork.medium}` : `Inspired by your ${artwork.category.toLowerCase().replaceAll('_', ' ')} interests`) : 'Popular with collectors',
      };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore || b.createdAt - a.createdAt).slice(0, 12);
    res.json({ personalized: Boolean(signals && (signals.wishlistItems.length || signals.cartItems.length || signals.artworkViews.length || signals.orders.length)), artworks: recommendations });
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
};

module.exports.artworkInclude = artworkInclude;
