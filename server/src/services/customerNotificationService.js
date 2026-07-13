const prisma = require('../config/database');

const createCustomerNotification = async ({ customerId, type, message, link = null, dedupeMinutes = 5 }) => {
  if (!customerId || !message) return null;

  const recent = await prisma.notification.findFirst({
    where: {
      customerId,
      type,
      message,
      link,
      createdAt: { gte: new Date(Date.now() - dedupeMinutes * 60 * 1000) },
    },
  });
  if (recent) return recent;

  return prisma.notification.create({
    data: { customerId, type, message: message.slice(0, 500), link },
  });
};

module.exports = { createCustomerNotification };
