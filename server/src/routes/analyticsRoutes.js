// server/src/routes/analyticsRoutes.js
const express = require('express');
const router  = express.Router();
const prisma  = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');

// ── Track Page View (Public — called from frontend) ──────────────
router.post('/pageview', async (req, res) => {
  try {
    const { path, title, referrer, sessionId, artworkId } = req.body;

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const device    = /mobile/i.test(userAgent)
      ? 'mobile'
      : /tablet/i.test(userAgent)
        ? 'tablet'
        : 'desktop';

    // Get browser name
    let browser = 'Unknown';
    if (userAgent.includes('Chrome'))       browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari'))  browser = 'Safari';
    else if (userAgent.includes('Edge'))    browser = 'Edge';

    // Get IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || req.connection?.remoteAddress
            || '';

    await prisma.pageView.create({
      data: {
        path,
        title:     title || null,
        referrer:  referrer || null,
        userAgent: userAgent.substring(0, 500),
        ip,
        device,
        browser,
        sessionId: sessionId || null,
        artworkId: artworkId || null,
      },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    // Don't crash the app for analytics failures
    console.error('Analytics error:', error.message);
    res.status(200).json({ ok: true });
  }
});

// ── Track Event (Public) ─────────────────────────────────────────
router.post('/event', async (req, res) => {
  try {
    const { event, data, sessionId } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || '';

    await prisma.analyticsEvent.create({
      data: {
        event,
        data: data || {},
        sessionId: sessionId || null,
        ip,
      },
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Analytics event error:', error.message);
    res.status(200).json({ ok: true });
  }
});

// ── Get Analytics Summary (Admin Only) ───────────────────────────
router.get('/summary', authenticateAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const now   = new Date();
    const days  = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Total page views
    const totalViews = await prisma.pageView.count({
      where: { createdAt: { gte: since } },
    });

    // Unique visitors (by sessionId)
    const uniqueVisitors = await prisma.pageView.groupBy({
      by:    ['sessionId'],
      where: {
        createdAt: { gte: since },
        sessionId: { not: null },
      },
    });

    // Views per page
    const viewsByPage = await prisma.pageView.groupBy({
      by:      ['path'],
      where:   { createdAt: { gte: since } },
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    10,
    });

    // Views per day
    const viewsByDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as views,
        COUNT(DISTINCT "sessionId")::int as visitors
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    // Device breakdown
    const deviceBreakdown = await prisma.pageView.groupBy({
      by:      ['device'],
      where:   { createdAt: { gte: since } },
      _count:  { id: true },
    });

    // Browser breakdown
    const browserBreakdown = await prisma.pageView.groupBy({
      by:      ['browser'],
      where:   { createdAt: { gte: since } },
      _count:  { id: true },
    });

    // Top artworks viewed
    const topArtworks = await prisma.pageView.groupBy({
      by:      ['artworkId'],
      where: {
        createdAt: { gte: since },
        artworkId: { not: null },
      },
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    10,
    });

    // Fetch artwork titles for top artworks
    const artworkIds = topArtworks
      .map(a => a.artworkId)
      .filter(Boolean);

    const artworks = artworkIds.length > 0
      ? await prisma.artwork.findMany({
          where:  { id: { in: artworkIds } },
          select: { id: true, title: true },
        })
      : [];

    const topArtworksWithTitles = topArtworks.map(a => ({
      artworkId: a.artworkId,
      views:     a._count.id,
      title:     artworks.find(art => art.id === a.artworkId)?.title || 'Unknown',
    }));

    // Recent events
    const recentEvents = await prisma.analyticsEvent.findMany({
      where:   { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take:    20,
    });

    // Event counts
    const eventCounts = await prisma.analyticsEvent.groupBy({
      by:      ['event'],
      where:   { createdAt: { gte: since } },
      _count:  { id: true },
    });

    res.json({
      period:    `${days} days`,
      summary: {
        totalViews,
        uniqueVisitors: uniqueVisitors.length,
        avgViewsPerDay: Math.round(totalViews / days),
      },
      viewsByPage: viewsByPage.map(v => ({
        path:  v.path,
        views: v._count.id,
      })),
      viewsByDay,
      deviceBreakdown: deviceBreakdown.map(d => ({
        device: d.device || 'Unknown',
        count:  d._count.id,
      })),
      browserBreakdown: browserBreakdown.map(b => ({
        browser: b.browser || 'Unknown',
        count:   b._count.id,
      })),
      topArtworks: topArtworksWithTitles,
      eventCounts: eventCounts.map(e => ({
        event: e.event,
        count: e._count.id,
      })),
      recentEvents,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;