import { analyticsAPI } from '../services/api';

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem('analytics_session', sessionId);
  }
  return sessionId;
};

const sendAnalyticsEvent = (eventName, params = {}) => {
  if (window.gtag) window.gtag('event', eventName, params);
  analyticsAPI.trackEvent({
    event: eventName,
    data: params,
    sessionId: getSessionId(),
  });
};

export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || document.querySelector(`script[data-ga-id="${measurementId}"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.dataset.gaId = measurementId;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
};

export const initWebVitals = () => {
  if (!('PerformanceObserver' in window)) return;

  const report = (name, value, id = name) => {
    sendAnalyticsEvent('web_vital', {
      metric_name: name,
      metric_value: Math.round(value * 1000) / 1000,
      metric_id: id,
      non_interaction: true,
    });
  };

  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries().at(-1);
      if (entry) report('LCP', entry.startTime, `${entry.entryType}-${entry.startTime}`);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    let cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value;
      });
    }).observe({ type: 'layout-shift', buffered: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        report('CLS', cumulativeLayoutShift, `cls-${Date.now()}`);
      }
    }, { once: true });
  } catch {
    // Some older browsers expose PerformanceObserver without these entry types.
  }
};

export const trackPageView = (path, title) => {
  if (window.gtag) {
    window.gtag('event', 'page_view', { page_path: path, page_title: title });
  }
  analyticsAPI.trackPageView({
    path,
    title,
    referrer: document.referrer || null,
    sessionId: getSessionId(),
  });
};

export const trackArtworkView = (artwork) => {
  sendAnalyticsEvent('view_item', {
    item_id: artwork.id,
    item_name: artwork.title,
    price: artwork.price,
    category: artwork.category,
    currency: 'USD',
  });
};

export const trackEvent = (eventName, params = {}) => {
  sendAnalyticsEvent(eventName, params);
};

export const trackAddToCart = (artwork) => {
  trackEvent('add_to_cart', {
    item_id: artwork.id,
    item_name: artwork.title,
    price: artwork.price,
    currency: 'USD',
  });
};

export const trackPurchase = (order, items, total) => {
  trackEvent('purchase', {
    transaction_id: order.orderNumber,
    value: total,
    currency: 'USD',
    items: items.map((item) => ({ item_id: item.id, item_name: item.title, price: item.price })),
  });
};

export const trackCommissionSubmit = (commission) => {
  trackEvent('generate_lead', {
    lead_source: 'commission_form',
    art_style: commission.artStyle,
    size: commission.size,
  });
};
