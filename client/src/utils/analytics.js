// client/src/utils/analytics.js
import { analyticsAPI } from '../services/api';

// ── Session ID ────────────────────────────────────────────────────
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session', sessionId);
  }
  return sessionId;
};

// ── Google Analytics ──────────────────────────────────────────────
export const initGA = () => {
  const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!GA_ID) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: false,
  });
};

// ── Track Page View (GA + Custom) ─────────────────────────────────
export const trackPageView = (path, title) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path:  path,
      page_title: title,
    });
  }

  // Custom analytics — fire and forget
  analyticsAPI.trackPageView({
    path,
    title,
    referrer:  document.referrer || null,
    sessionId: getSessionId(),
  });
};

// ── Track Artwork View ────────────────────────────────────────────
export const trackArtworkView = (artwork) => {
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      item_id:   artwork.id,
      item_name: artwork.title,
      price:     artwork.price,
      category:  artwork.category,
    });
  }

  analyticsAPI.trackPageView({
    path:      `/artwork/${artwork.id}`,
    title:     artwork.title,
    sessionId: getSessionId(),
    artworkId: artwork.id,
  });
};

// ── Track Events (GA + Custom) ────────────────────────────────────
export const trackEvent = (eventName, params = {}) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  // Custom analytics
  analyticsAPI.trackEvent({
    event:     eventName,
    data:      params,
    sessionId: getSessionId(),
  });
};

// ── Convenience methods ───────────────────────────────────────────
export const trackAddToCart = (artwork) => {
  trackEvent('add_to_cart', {
    item_id:   artwork.id,
    item_name: artwork.title,
    price:     artwork.price,
  });
};

export const trackPurchase = (order, items, total) => {
  trackEvent('purchase', {
    transaction_id: order.orderNumber,
    value:          total,
    currency:       'USD',
    items:          items.map(item => ({
      item_id:   item.id,
      item_name: item.title,
      price:     item.price,
    })),
  });
};

export const trackCommissionSubmit = (commission) => {
  trackEvent('commission_submit', {
    art_style: commission.artStyle,
    size:      commission.size,
  });
};