const prisma = require('../config/database');
const { sendAutomationEmail } = require('../utils/emailService');
const { recordOperationalEvent } = require('../utils/operationalEvents');

const MAX_ATTEMPTS = 3;
const DEFAULT_WORKFLOWS = [{
  type: 'WELCOME',
  name: 'Verified account welcome',
  subject: 'Welcome to Highmarc Art Atelier',
  htmlBody: '<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;color:#292524"><p style="color:#b45309;text-transform:uppercase;letter-spacing:2px;font-size:11px">Welcome to Highmarc</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:34px">Your account is ready</h1><p>Hello {{firstName}},</p><p style="line-height:1.7;color:#57534e">Your email has been verified. You can now manage your collection, follow commissions, save artworks, and securely access digital purchases from your Highmarc account.</p><p style="margin-top:28px"><a href="https://highmarc.com/gallery" style="display:inline-block;background:#1c1917;color:#fff;padding:14px 24px;text-decoration:none;border-radius:6px">Explore the collection</a></p></div>',
  delayMinutes: 0,
}];

const normalizeDelay = value => Math.min(Math.max(Math.round(Number(value) || 0), 0), 10080);

const ensureDefaultWorkflows = async () => Promise.all(DEFAULT_WORKFLOWS.map(workflow => prisma.automationWorkflow.upsert({
  where: { type: workflow.type },
  update: {},
  create: { ...workflow, enabled: false },
})));

const refreshWorkflowCounts = async workflowId => {
  const groups = await prisma.automationDelivery.groupBy({
    by: ['status'], where: { workflowId }, _count: { _all: true },
  });
  const counts = Object.fromEntries(groups.map(item => [item.status, item._count._all]));
  return prisma.automationWorkflow.update({
    where: { id: workflowId },
    data: { sentCount: counts.SENT || 0, failedCount: counts.FAILED || 0 },
  });
};

const listWorkflows = async () => {
  await ensureDefaultWorkflows();
  return prisma.automationWorkflow.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' }, take: 10,
        select: { id: true, status: true, attempts: true, lastError: true, scheduledFor: true, sentAt: true, createdAt: true },
      },
    },
  });
};

const updateWorkflow = async (id, data) => {
  const subject = data.subject?.trim();
  const htmlBody = data.htmlBody;
  if (!subject || !htmlBody) {
    const error = new Error('Subject and email body are required');
    error.status = 400;
    throw error;
  }
  return prisma.automationWorkflow.update({
    where: { id },
    data: { subject, htmlBody, enabled: data.enabled === true, delayMinutes: normalizeDelay(data.delayMinutes) },
  });
};

const enqueueAutomationEvent = async ({ type, customerId, eventKey }) => {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { type } });
  if (!workflow?.enabled) return null;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, isVerified: true, isSuspended: false }, select: { id: true },
  });
  if (!customer) return null;
  const scheduledFor = new Date(Date.now() + normalizeDelay(workflow.delayMinutes) * 60 * 1000);
  return prisma.automationDelivery.upsert({
    where: { workflowId_eventKey: { workflowId: workflow.id, eventKey: String(eventKey) } },
    update: {},
    create: { workflowId: workflow.id, customerId, eventKey: String(eventKey), scheduledFor },
  });
};

const processAutomationBatch = async ({ workflowId, limit = 10 } = {}) => {
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.automationDelivery.updateMany({
    where: { status: 'PROCESSING', claimedAt: { lt: staleBefore } },
    data: { status: 'FAILED', claimedAt: null, lastError: 'Delivery claim expired before completion' },
  });
  const deliveries = await prisma.automationDelivery.findMany({
    where: {
      ...(workflowId ? { workflowId } : {}),
      workflow: { is: { enabled: true } },
      scheduledFor: { lte: new Date() },
      OR: [{ status: 'PENDING' }, { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } }],
    },
    orderBy: { scheduledFor: 'asc' },
    take: Math.min(Math.max(Number(limit) || 10, 1), 25),
    include: { workflow: true },
  });

  const affected = new Set();
  for (const delivery of deliveries) {
    const claim = await prisma.automationDelivery.updateMany({
      where: { id: delivery.id, status: delivery.status, attempts: delivery.attempts },
      data: { status: 'PROCESSING', claimedAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
    if (!claim.count) continue;
    affected.add(delivery.workflowId);
    try {
      const customer = await prisma.customer.findFirst({
        where: { id: delivery.customerId, isVerified: true, isSuspended: false },
        select: { email: true, firstName: true },
      });
      if (!customer) {
        await prisma.automationDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED', claimedAt: null, lastError: 'Customer is no longer eligible' } });
        continue;
      }
      const info = await sendAutomationEmail({ email: customer.email, firstName: customer.firstName, subject: delivery.workflow.subject, htmlBody: delivery.workflow.htmlBody });
      await prisma.automationDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), claimedAt: null, messageId: info.messageId || null } });
    } catch (error) {
      await prisma.automationDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', claimedAt: null, lastError: String(error.message || error).slice(0, 2000) } });
      await recordOperationalEvent('AUTOMATION_DELIVERY_FAILURE', error.message || error, { workflowId: delivery.workflowId, deliveryId: delivery.id });
    }
  }
  await Promise.all([...affected].map(refreshWorkflowCounts));
  return { processed: deliveries.length };
};

const retryWorkflow = async id => {
  const result = await prisma.automationDelivery.updateMany({
    where: { workflowId: id, status: 'FAILED' },
    data: { status: 'PENDING', attempts: 0, claimedAt: null, lastError: null, scheduledFor: new Date() },
  });
  if (!result.count) {
    const error = new Error('This automation has no failed deliveries to retry');
    error.status = 409;
    throw error;
  }
  return processAutomationBatch({ workflowId: id });
};

module.exports = { DEFAULT_WORKFLOWS, normalizeDelay, ensureDefaultWorkflows, listWorkflows, updateWorkflow, enqueueAutomationEvent, processAutomationBatch, retryWorkflow };
