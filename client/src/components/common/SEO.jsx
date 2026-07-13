import { Helmet } from 'react-helmet-async';

export const SITE_URL = 'https://highmarc.com';
export const SITE_NAME = 'Highmarc';

const absoluteUrl = (value, fallback) => {
  if (!value) return fallback;
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return fallback;
  }
};

const SEO = ({
  title,
  description,
  keywords,
  image,
  imageAlt,
  url,
  type = 'website',
  noIndex = false,
  structuredData,
}) => {
  const defaultDescription = 'Original artworks, portraits and bespoke commissions. Shop unique fine art online.';
  const defaultImage = `${SITE_URL}/icon.png`;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Fine Art Atelier`;
  const metaDescription = description || defaultDescription;
  const metaImage = absoluteUrl(image, defaultImage);
  const canonicalUrl = absoluteUrl(url || '/', SITE_URL);
  const schemas = (Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean);

  return (
    <Helmet>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      {keywords && <meta name="keywords" content={keywords} />}
      {!noIndex && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:image:alt" content={imageAlt || title || SITE_NAME} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      <meta name="twitter:image:alt" content={imageAlt || title || SITE_NAME} />

      {schemas.map((schema, index) => (
        <script type="application/ld+json" key={`${schema['@type'] || 'schema'}-${index}`}>
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
