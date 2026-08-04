const LICENSE_TYPES = {
  PERSONAL: 'PERSONAL_USE',
  COMMERCIAL: 'COMMERCIAL_USE',
};

const normalizeLicenseType = (artwork, requested) => {
  const wantsCommercial = String(requested || '').toUpperCase() === LICENSE_TYPES.COMMERCIAL;
  if (wantsCommercial && artwork?.productType === 'DIGITAL' && artwork.commercialLicenseEnabled && artwork.commercialPrice != null) {
    return LICENSE_TYPES.COMMERCIAL;
  }
  return LICENSE_TYPES.PERSONAL;
};

const priceForLicense = (artwork, licenseType) => Number(
  licenseType === LICENSE_TYPES.COMMERCIAL ? artwork.commercialPrice : artwork.price
);

const remainingEditions = artwork => artwork?.editionSize == null
  ? null
  : Math.max(Number(artwork.editionSize) - Number(artwork.editionsIssued || 0) - Number(artwork.editionsReserved || 0), 0);

module.exports = { LICENSE_TYPES, normalizeLicenseType, priceForLicense, remainingEditions };
