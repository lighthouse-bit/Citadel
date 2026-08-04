const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

const profileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isVerified: true,
  password: true,
  googleId: true,
  addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
};

const clean = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const publicProfile = ({ password, googleId, ...customer }) => ({
  ...customer,
  hasPassword: Boolean(password),
  googleLinked: Boolean(googleId),
});

const addressData = body => ({
  label: clean(body.label, 40) || null,
  line1: clean(body.line1, 200),
  line2: clean(body.line2, 200) || null,
  city: clean(body.city, 100),
  state: clean(body.state, 100) || null,
  postalCode: clean(body.postalCode, 30),
  country: clean(body.country, 100),
});

const validateAddress = data => {
  if (!data.line1 || !data.city || !data.postalCode || !data.country) return 'Address, city, postal code and country are required';
  return null;
};

exports.getProfile = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.user.id }, select: profileSelect });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(publicProfile(customer));
  } catch (error) {
    console.error('Failed to load customer profile:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const firstName = clean(req.body.firstName, 80);
    const lastName = clean(req.body.lastName, 80);
    const phone = clean(req.body.phone, 40) || null;
    if (!firstName || !lastName) return res.status(400).json({ error: 'First and last name are required' });
    const customer = await prisma.customer.update({
      where: { id: req.user.id },
      data: { firstName, lastName, phone },
      select: profileSelect,
    });
    res.json(publicProfile(customer));
  } catch (error) {
    console.error('Failed to update customer profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.user.id }, select: { id: true, password: true } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const newPassword = req.body.newPassword;
    if (typeof newPassword !== 'string' || newPassword.length < 12) return res.status(400).json({ error: 'New password must be at least 12 characters' });
    if (customer.password && !await bcrypt.compare(req.body.currentPassword || '', customer.password)) return res.status(401).json({ error: 'Current password is incorrect' });
    if (customer.password && await bcrypt.compare(newPassword, customer.password)) return res.status(400).json({ error: 'Choose a different password' });
    await prisma.customer.update({
      where: { id: customer.id },
      data: { password: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date() },
    });
    res.json({ success: true, message: customer.password ? 'Password changed' : 'Password created' });
  } catch (error) {
    console.error('Failed to change customer password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const data = addressData(req.body);
    const validationError = validateAddress(data);
    if (validationError) return res.status(400).json({ error: validationError });
    const address = await prisma.$transaction(async tx => {
      const count = await tx.address.count({ where: { customerId: req.user.id } });
      if (count >= 10) {
        const error = new Error('You can save up to 10 addresses');
        error.statusCode = 400;
        throw error;
      }
      const makeDefault = Boolean(req.body.isDefault) || count === 0;
      if (makeDefault) await tx.address.updateMany({ where: { customerId: req.user.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, customerId: req.user.id, isDefault: makeDefault } });
    });
    res.status(201).json(address);
  } catch (error) {
    console.error('Failed to create address:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Failed to save address' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    const data = addressData(req.body);
    const validationError = validateAddress(data);
    if (validationError) return res.status(400).json({ error: validationError });
    const address = await prisma.$transaction(async tx => {
      if (req.body.isDefault === true) await tx.address.updateMany({ where: { customerId: req.user.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id: existing.id }, data: { ...data, isDefault: req.body.isDefault === true ? true : existing.isDefault } });
    });
    res.json(address);
  } catch (error) {
    console.error('Failed to update address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    const address = await prisma.$transaction(async tx => {
      await tx.address.updateMany({ where: { customerId: req.user.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id: existing.id }, data: { isDefault: true } });
    });
    res.json(address);
  } catch (error) {
    console.error('Failed to set default address:', error);
    res.status(500).json({ error: 'Failed to set default address' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, customerId: req.user.id } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.$transaction(async tx => {
      await tx.address.delete({ where: { id: existing.id } });
      if (existing.isDefault) {
        const replacement = await tx.address.findFirst({ where: { customerId: req.user.id }, orderBy: { createdAt: 'desc' } });
        if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, isVerified: true,
        wishlistAvailabilityAlerts: true, wishlistPriceAlerts: true, newArtworkAlerts: true, marketingEmails: true,
        emailPreferencesUpdatedAt: true, createdAt: true, updatedAt: true,
        addresses: true,
        orders: { select: {
          id: true, orderNumber: true, subtotal: true, shippingCost: true, tax: true, total: true,
          discountAmount: true, promotionCode: true, status: true, paymentStatus: true, shippingMethod: true,
          trackingNumber: true, trackingUrl: true, estimatedDelivery: true, createdAt: true, updatedAt: true,
          items: { select: { id: true, title: true, price: true, artworkId: true, licenseType: true } },
        } },
        commissions: { select: {
          id: true, commissionNumber: true, artStyle: true, size: true, description: true, estimatedPrice: true,
          finalPrice: true, depositAmount: true, balanceAmount: true, depositPercentage: true, status: true,
          paymentStatus: true, deadline: true, createdAt: true, updatedAt: true,
          referenceImages: { select: { id: true, url: true, originalName: true, createdAt: true } },
          progressImages: { select: { id: true, imageUrl: true, description: true, createdAt: true } },
          notes: { where: { isInternal: false }, select: { id: true, content: true, createdAt: true } },
        } },
        wishlistItems: { select: { createdAt: true, artwork: { select: { id: true, title: true } } } },
        cartItems: { select: { createdAt: true, updatedAt: true, licenseType: true, artwork: { select: { id: true, title: true } } } },
        reviews: { select: { id: true, rating: true, title: true, comment: true, isPublished: true, artworkId: true, orderId: true, createdAt: true, updatedAt: true } },
        supportTickets: { select: {
          id: true, ticketNumber: true, subject: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true, resolvedAt: true,
          messages: { select: { id: true, body: true, authorType: true, createdAt: true, attachments: { select: { name: true, url: true, createdAt: true } } } },
        } },
        digitalEntitlements: { select: {
          id: true, licenseType: true, licenseName: true, licenseText: true, editionNumber: true, editionSize: true,
          downloadLimit: true, downloadCount: true, lastDownloadedAt: true, revokedAt: true, createdAt: true,
          artwork: { select: { id: true, title: true } }, downloads: { select: { downloadedAt: true, userAgent: true } },
        } },
        privacyRequests: { select: { id: true, type: true, status: true, details: true, response: true, createdAt: true, updatedAt: true, resolvedAt: true } },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const payload = { generatedAt: new Date().toISOString(), service: 'Highmarc Art Atelier', customer };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="highmarc-data-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Failed to export customer data:', error);
    return res.status(500).json({ error: 'Failed to prepare your data export' });
  }
};
