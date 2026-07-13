import { useLocation } from 'react-router-dom';
import SEO, { SITE_NAME, SITE_URL } from './SEO';

const publicRoutes = {
  '/': {
    title: 'Fine Art Atelier',
    description: 'Discover original fine art paintings, portraits and bespoke commissions at Highmarc Art Atelier.',
  },
  '/gallery': {
    title: 'Original Art Gallery',
    description: 'Browse a curated collection of original paintings, drawings and mixed-media artwork.',
  },
  '/shop': {
    title: 'Shop Original Artwork',
    description: 'Purchase original fine art with certificates of authenticity and worldwide shipping.',
  },
  '/commission': {
    title: 'Bespoke Art Commissions',
    description: 'Commission a unique portrait, landscape or abstract artwork tailored to your vision.',
  },
  '/about': {
    title: 'About the Artist',
    description: 'Meet the artist and discover the story, process and practice behind Highmarc Art Atelier.',
  },
  '/contact': {
    title: 'Contact the Atelier',
    description: 'Contact Highmarc Art Atelier about artwork, commissions, shipping or collaborations.',
  },
};

const privatePrefixes = ['/admin', '/account', '/checkout', '/verify-email', '/track', '/commission/payment'];

const RouteMetadata = () => {
  const { pathname } = useLocation();
  const route = publicRoutes[pathname];
  const noIndex = privatePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (route) {
    const schemas = [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: route.title,
      description: route.description,
      url: `${SITE_URL}${pathname === '/' ? '' : pathname}`,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    }];
    if (pathname === '/') {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'ArtGallery',
        name: 'Highmarc Art Atelier',
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        image: `${SITE_URL}/icon.png`,
        description: route.description,
      });
    }
    return (
      <SEO
        {...route}
        url={pathname}
        structuredData={schemas}
      />
    );
  }

  if (noIndex) {
    return <SEO title="Private page" url={pathname} noIndex />;
  }

  // Dynamic artwork pages provide their own metadata after loading.
  if (pathname.startsWith('/artwork/')) return null;

  return <SEO title="Page not found" url={pathname} noIndex />;
};

export default RouteMetadata;
