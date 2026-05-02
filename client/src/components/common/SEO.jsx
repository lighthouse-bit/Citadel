// client/src/components/common/SEO.jsx
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
}) => {
  const siteName    = 'Highmarc';
  const defaultDesc = 'Original artworks, portraits and bespoke commissions. Shop unique fine art online.';
  const defaultImg  = 'https://highmarc.com/og-image.jpg';
  const baseUrl     = 'https://highmarc.com';

  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const metaDesc  = description || defaultDesc;
  const metaImage = image || defaultImg;
  const metaUrl   = url ? `${baseUrl}${url}` : baseUrl;

  return (
    <Helmet>
      {/* ── Basic ───────────────────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={metaUrl} />

      {/* ── Open Graph ──────────────────────────────────── */}
      <meta property="og:type"        content={type} />
      <meta property="og:url"         content={metaUrl} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image"       content={metaImage} />
      <meta property="og:site_name"   content={siteName} />

      {/* ── Twitter ─────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image"       content={metaImage} />
    </Helmet>
  );
};

export default SEO;