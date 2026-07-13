const FREE_SHIPPING_THRESHOLD = 1000;

const getZoneByCountry = country => {
  const upper = String(country || '').trim().toUpperCase();
  if (upper === 'NIGERIA' || upper === 'NG') return 'Nigeria';
  const africanCountries = ['GHANA', 'KENYA', 'SOUTH AFRICA', 'EGYPT', 'ETHIOPIA', 'TANZANIA', 'UGANDA', 'RWANDA', 'SENEGAL', 'IVORY COAST', 'MOROCCO', 'ALGERIA', 'ANGOLA', 'CAMEROON', 'BOTSWANA', 'TUNISIA', 'LIBYA', 'SUDAN', 'ZIMBABWE', 'ZAMBIA', 'MOZAMBIQUE', 'NAMIBIA', 'BENIN', 'TOGO', 'NIGER'];
  return africanCountries.includes(upper) ? 'Africa' : 'International';
};

const getArtworkSize = (width, height) => {
  const maxDimension = Math.max(Number(width) || 0, Number(height) || 0);
  if (maxDimension <= 12) return 'small';
  if (maxDimension <= 24) return 'medium';
  if (maxDimension <= 36) return 'large';
  return 'xlarge';
};

const calculateShipping = async (prisma, country, items) => {
  if (!items.length) return { shippingCost: 0, zone: 'Unknown', size: 'unknown', isFreeShipping: false, message: 'No items in cart' };
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const zoneName = getZoneByCountry(country);
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return { shippingCost: 0, zone: zoneName, size: 'free', isFreeShipping: true, message: `Free shipping on orders over $${FREE_SHIPPING_THRESHOLD}` };
  const zone = await prisma.shippingZone.findFirst({ where: { name: zoneName, isActive: true }, include: { rates: true } });
  if (!zone?.rates.length) {
    const error = new Error(`Shipping is not currently available to ${country}. Please contact us.`);
    error.statusCode = 400;
    throw error;
  }
  const sizes = { small: 1, medium: 2, large: 3, xlarge: 4 };
  const size = items.reduce((largest, item) => {
    const current = getArtworkSize(item.width, item.height);
    return sizes[current] > sizes[largest] ? current : largest;
  }, 'small');
  const rate = zone.rates[0];
  const shippingCost = Number({ small: rate.smallRate, medium: rate.mediumRate, large: rate.largeRate, xlarge: rate.xlargeRate }[size]);
  return { shippingCost, zone: zoneName, size, estimatedDays: rate.estimatedDays, isFreeShipping: false, message: `Shipping to ${zoneName} (${size})` };
};

module.exports = { calculateShipping, getArtworkSize, getZoneByCountry, FREE_SHIPPING_THRESHOLD };
