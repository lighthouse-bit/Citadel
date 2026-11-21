const crypto = require('crypto');

const assignCampaignVariant = (campaignId, customerId, enabled) => {
  if (!enabled) return 'A';
  const digest = crypto.createHash('sha256').update(`${campaignId}:${customerId}`).digest();
  return digest[0] % 2 === 0 ? 'A' : 'B';
};

const subjectForVariant = (campaign, variant) => (
  campaign.abTestEnabled && variant === 'B' && campaign.subjectB
    ? campaign.subjectB
    : campaign.subject
);

module.exports = { assignCampaignVariant, subjectForVariant };
