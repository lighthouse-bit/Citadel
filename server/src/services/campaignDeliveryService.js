const prisma = require('../config/database');
const { signAlertToken } = require('../utils/wishlistAlertTokens');
const { sendMarketingCampaignEmail } = require('../utils/emailService');
const { recordOperationalEvent } = require('../utils/operationalEvents');
const { assignCampaignVariant, subjectForVariant } = require('../utils/campaignVariants');

const MAX_ATTEMPTS = 3;
const DEFAULT_BATCH_SIZE = 10;
const STALE_CLAIM_MINUTES = 10;
const RECENT_DAYS = 90;
const INACTIVE_DAYS = 180;
const HIGH_VALUE_MINIMUM = 5000;
const VALID_SEGMENTS = new Set(['VERIFIED', 'ALL', 'CUSTOMERS', 'COMMISSION_CLIENTS', 'RECENT_CUSTOMERS', 'HIGH_VALUE_COLLECTORS', 'INACTIVE_CUSTOMERS']);

const segmentWhere = (segment, now = new Date()) => {
  const recentCutoff = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const inactiveCutoff = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  return {
    isSuspended: false,
    marketingEmails: true,
    ...(segment === 'VERIFIED'
      ? { isVerified: true }
      : segment === 'CUSTOMERS'
        ? { orders: { some: { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' } } } }
        : segment === 'COMMISSION_CLIENTS'
          ? { commissions: { some: { paymentStatus: { in: ['DEPOSIT_PAID', 'FULLY_PAID'] }, status: { not: 'CANCELLED' } } } }
          : segment === 'RECENT_CUSTOMERS'
            ? { createdAt: { gte: recentCutoff } }
            : segment === 'HIGH_VALUE_COLLECTORS'
              ? { OR: [
                { orders: { some: { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' }, total: { gte: HIGH_VALUE_MINIMUM } } } },
                { commissions: { some: { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' }, finalPrice: { gte: HIGH_VALUE_MINIMUM } } } },
              ] }
              : segment === 'INACTIVE_CUSTOMERS'
                ? {
                  createdAt: { lt: inactiveCutoff },
                  orders: { none: { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' }, createdAt: { gte: inactiveCutoff } } },
                  commissions: { none: { paymentStatus: { in: ['DEPOSIT_PAID', 'FULLY_PAID'] }, status: { not: 'CANCELLED' }, updatedAt: { gte: inactiveCutoff } } },
                }
                : {}),
  };
};

const previewAudience = async segment => {
  if (!VALID_SEGMENTS.has(segment)) {
    const error = new Error('Invalid recipient segment');
    error.status = 400;
    throw error;
  }
  const where = segmentWhere(segment);
  const [count, samples] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);
  return { count, samples };
};

const campaignStatusFromCounts = ({ delivered, failed, pending, processing, retryable }) => {
  if (pending > 0 || processing > 0 || retryable > 0) return 'SENDING';
  if (failed > 0 && delivered > 0) return 'PARTIAL';
  if (failed > 0) return 'FAILED';
  return 'COMPLETED';
};

const prepareCampaign = async campaignId => {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }
  if (!VALID_SEGMENTS.has(campaign.segment)) {
    const error = new Error('Campaign has an invalid recipient segment');
    error.status = 400;
    throw error;
  }
  if (campaign.status !== 'DRAFT') {
    const error = new Error('Only draft campaigns can be queued');
    error.status = 409;
    throw error;
  }

  const claim = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: 'DRAFT' },
    data: { status: 'PREPARING' },
  });
  if (!claim.count) return prisma.emailCampaign.findUnique({ where: { id: campaignId } });

  try {
    const recipients = await prisma.customer.findMany({
      where: segmentWhere(campaign.segment),
      select: { id: true, email: true, firstName: true },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });

    if (!recipients.length) {
      const error = new Error('This campaign has no eligible opted-in recipients');
      error.status = 409;
      throw error;
    }

    await prisma.campaignDelivery.createMany({
      data: recipients.map(recipient => ({
        campaignId,
        customerId: recipient.id,
        email: recipient.email,
        firstName: recipient.firstName,
        variant: assignCampaignVariant(campaignId, recipient.id, campaign.abTestEnabled),
      })),
      skipDuplicates: true,
    });

    const recipientCount = await prisma.campaignDelivery.count({ where: { campaignId } });
    const now = new Date();
    return prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: recipientCount ? 'QUEUED' : 'COMPLETED',
        recipientCount,
        preparedAt: now,
        completedAt: recipientCount ? null : now,
        sentAt: recipientCount ? null : now,
      },
    });
  } catch (error) {
    await prisma.emailCampaign.updateMany({
      where: { id: campaignId, status: 'PREPARING' },
      data: { status: 'DRAFT' },
    });
    throw error;
  }
};

const scheduleCampaign = async (campaignId, scheduledAtValue) => {
  const scheduledAt = new Date(scheduledAtValue);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now() + 60 * 1000) {
    const error = new Error('Choose a scheduled time at least one minute in the future');
    error.status = 400;
    throw error;
  }
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }
  if (campaign.status !== 'DRAFT') {
    const error = new Error('Only draft campaigns can be scheduled');
    error.status = 409;
    throw error;
  }
  const audience = await previewAudience(campaign.segment);
  if (!audience.count) {
    const error = new Error('This campaign has no eligible opted-in recipients');
    error.status = 409;
    throw error;
  }
  const claim = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: 'DRAFT' },
    data: { status: 'SCHEDULED', scheduledAt, recipientCount: audience.count },
  });
  if (!claim.count) {
    const error = new Error('Campaign changed before it could be scheduled');
    error.status = 409;
    throw error;
  }
  return prisma.emailCampaign.findUnique({ where: { id: campaignId } });
};

const unscheduleCampaign = async campaignId => {
  const result = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: 'SCHEDULED' },
    data: { status: 'DRAFT', scheduledAt: null, recipientCount: 0 },
  });
  if (!result.count) {
    const existing = await prisma.emailCampaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    const error = new Error(existing ? 'Only scheduled campaigns can be returned to draft' : 'Campaign not found');
    error.status = existing ? 409 : 404;
    throw error;
  }
  return prisma.emailCampaign.findUnique({ where: { id: campaignId } });
};

const activateScheduledCampaign = async campaignId => {
  const claim = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    data: { status: 'DRAFT' },
  });
  if (!claim.count) return prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  return prepareCampaign(campaignId);
};

const getCounts = async campaignId => {
  const grouped = await prisma.campaignDelivery.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map(item => [item.status, item._count._all]));
  const retryable = await prisma.campaignDelivery.count({
    where: { campaignId, status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
  });
  return {
    delivered: counts.DELIVERED || 0,
    failed: counts.FAILED || 0,
    skipped: counts.SKIPPED || 0,
    pending: counts.PENDING || 0,
    processing: counts.PROCESSING || 0,
    retryable,
  };
};

const finalizeCampaign = async campaignId => {
  const counts = await getCounts(campaignId);
  const status = campaignStatusFromCounts(counts);
  const complete = ['COMPLETED', 'PARTIAL', 'FAILED'].includes(status);
  const now = new Date();
  return prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status,
      deliveredCount: counts.delivered,
      failedCount: counts.failed,
      skippedCount: counts.skipped,
      lastProcessedAt: now,
      completedAt: complete ? now : null,
      sentAt: complete ? now : null,
    },
  });
};

const processCampaignBatch = async ({ campaignId, batchSize = DEFAULT_BATCH_SIZE } = {}) => {
  let campaign = campaignId
    ? await prisma.emailCampaign.findUnique({ where: { id: campaignId } })
    : await prisma.emailCampaign.findFirst({
      where: { status: { in: ['QUEUED', 'SENDING'] } },
      orderBy: { createdAt: 'asc' },
    });
  if (!campaign) return null;
  if (campaign.status === 'SCHEDULED') {
    campaign = await activateScheduledCampaign(campaign.id);
    if (!campaign || campaign.status === 'SCHEDULED') return campaign;
  }
  if (!['QUEUED', 'SENDING'].includes(campaign.status)) return campaign;

  const staleBefore = new Date(Date.now() - STALE_CLAIM_MINUTES * 60 * 1000);
  await prisma.campaignDelivery.updateMany({
    where: { campaignId: campaign.id, status: 'PROCESSING', claimedAt: { lt: staleBefore } },
    data: { status: 'FAILED', lastError: 'Delivery claim expired before completion' },
  });
  await prisma.emailCampaign.updateMany({
    where: { id: campaign.id, status: { in: ['QUEUED', 'SENDING'] } },
    data: { status: 'SENDING', startedAt: campaign.startedAt || new Date() },
  });

  const candidates = await prisma.campaignDelivery.findMany({
    where: {
      campaignId: campaign.id,
      OR: [
        { status: 'PENDING' },
        { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: Math.min(Math.max(Number(batchSize) || DEFAULT_BATCH_SIZE, 1), 25),
  });

  for (const delivery of candidates) {
    const claimedAt = new Date();
    const claim = await prisma.campaignDelivery.updateMany({
      where: { id: delivery.id, status: delivery.status, attempts: delivery.attempts },
      data: { status: 'PROCESSING', claimedAt, attempts: { increment: 1 }, lastError: null },
    });
    if (!claim.count) continue;

    try {
      const eligibleCustomer = await prisma.customer.findFirst({
        where: { id: delivery.customerId, ...segmentWhere(campaign.segment) },
        select: { id: true, email: true, firstName: true },
      });
      if (!eligibleCustomer) {
        await prisma.campaignDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SKIPPED', claimedAt: null, lastError: 'Recipient is no longer eligible or subscribed' },
        });
        continue;
      }

      const unsubscribeToken = signAlertToken('marketing-unsubscribe', eligibleCustomer.id, delivery.id);
      const info = await sendMarketingCampaignEmail({
        email: eligibleCustomer.email,
        firstName: eligibleCustomer.firstName,
        subject: subjectForVariant(campaign, delivery.variant),
        htmlBody: campaign.htmlBody,
        unsubscribeToken,
        customerId: eligibleCustomer.id,
        deliveryId: delivery.id,
      });
      await prisma.campaignDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          email: eligibleCustomer.email,
          firstName: eligibleCustomer.firstName,
          messageId: info.messageId || null,
          deliveredAt: new Date(),
          claimedAt: null,
        },
      });
    } catch (error) {
      await prisma.campaignDelivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', claimedAt: null, lastError: String(error.message || error).slice(0, 2000) },
      });
      await recordOperationalEvent('CAMPAIGN_DELIVERY_FAILURE', error.message || error, {
        campaignId: campaign.id,
        deliveryId: delivery.id,
      });
    }
  }

  return finalizeCampaign(campaign.id);
};

const retryCampaign = async campaignId => {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }
  if (!['PARTIAL', 'FAILED'].includes(campaign.status)) {
    const error = new Error('Only failed or partially delivered campaigns can be retried');
    error.status = 409;
    throw error;
  }
  const reset = await prisma.campaignDelivery.updateMany({
    where: { campaignId, status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, claimedAt: null, lastError: null },
  });
  if (!reset.count) {
    const error = new Error('This campaign has no failed deliveries to retry');
    error.status = 409;
    throw error;
  }
  return prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: 'QUEUED', failedCount: 0, completedAt: null, sentAt: null },
  });
};

const processQueuedCampaigns = async () => {
  const due = await prisma.emailCampaign.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: 'asc' },
    select: { id: true },
    take: 3,
  });
  const results = [];
  for (const item of due) {
    const activated = await activateScheduledCampaign(item.id);
    if (activated?.status === 'QUEUED') results.push(await processCampaignBatch({ campaignId: item.id }));
  }
  const remaining = Math.max(3 - results.length, 0);
  const active = remaining ? await prisma.emailCampaign.findMany({
    where: { status: { in: ['QUEUED', 'SENDING'] }, id: { notIn: due.map(item => item.id) } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
    take: remaining,
  }) : [];
  for (const item of active) results.push(await processCampaignBatch({ campaignId: item.id }));
  return results;
};

module.exports = {
  MAX_ATTEMPTS,
  VALID_SEGMENTS,
  segmentWhere,
  previewAudience,
  campaignStatusFromCounts,
  prepareCampaign,
  scheduleCampaign,
  unscheduleCampaign,
  activateScheduledCampaign,
  processCampaignBatch,
  processQueuedCampaigns,
  retryCampaign,
};
