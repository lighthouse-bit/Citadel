// server/src/utils/trackingService.js
const https = require('https');

const TRACK17_API_KEY = process.env.TRACK17_API_KEY;

// ── Carrier code mapping ─────────────────────────────────
// 17track uses specific codes for each carrier
const CARRIER_CODES = {
  'DHL':              100003,  // DHL Express
  'FedEx':            100003,  // FedEx
  'UPS':              100001,  // UPS
  'USPS':             21051,   // USPS
  'NIPOST':           190085,  // Nigeria Post
  'GIG Logistics':    190154,  // GIG Logistics Nigeria
  'Sendbox':          190155,  // Sendbox Nigeria
  // Add more as needed
};

// ── Register tracking with 17track ───────────────────────
const registerTracking = (trackingNumber, carrier) => {
  return new Promise((resolve, reject) => {
    const carrierCode = CARRIER_CODES[carrier];

    const payload = JSON.stringify([{
      number:  trackingNumber,
      carrier: carrierCode,
    }]);

    const options = {
      hostname: 'api.17track.net',
      path:     '/track/v2.2/register',
      method:   'POST',
      headers: {
        '17token':        TRACK17_API_KEY,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

// ── Get tracking info ────────────────────────────────────
const getTrackingInfo = (trackingNumber, carrier) => {
  return new Promise((resolve, reject) => {
    const carrierCode = CARRIER_CODES[carrier];

    const payload = JSON.stringify([{
      number:  trackingNumber,
      carrier: carrierCode,
    }]);

    const options = {
      hostname: 'api.17track.net',
      path:     '/track/v2.2/gettrackinfo',
      method:   'POST',
      headers: {
        '17token':        TRACK17_API_KEY,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          // Parse 17track response into clean format
          const trackData = result?.data?.accepted?.[0]?.track_info;
          
          if (!trackData) {
            return resolve(null);
          }

          resolve({
            status:        trackData.latest_status?.status || 'Unknown',
            statusText:    trackData.latest_status?.sub_status_descr || '',
            location:      trackData.latest_event?.location || '',
            timestamp:     trackData.latest_event?.time_iso || '',
            estimatedDelivery: trackData.time_metrics?.estimated_delivery_date?.from || null,
            events: (trackData.tracking?.providers?.[0]?.events || []).map(event => ({
              date:        event.time_iso,
              status:      event.stage || event.sub_status,
              description: event.description,
              location:    event.location,
            })),
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

module.exports = {
  registerTracking,
  getTrackingInfo,
  CARRIER_CODES,
};