import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { routeMetadata, siteConfig, getJsonLd, getCanonical, type SeoMetadata } from '@/lib/seo';

function resolvePath(pathname: string, meta: SeoMetadata | undefined): SeoMetadata {
  if (meta) return meta;
  if (pathname.startsWith('/firs/')) return routeMetadata['/firs/:crimeNo'];
  if (pathname.startsWith('/geo/district/') || pathname.startsWith('/geo/station/'))
    return routeMetadata['/geo'];
  return {
    title: `${siteConfig.shortName} – Karnataka Police AI Intelligence`,
    description: siteConfig.description,
    canonical: getCanonical(pathname),
  };
}

export function SeoHead() {
  const { pathname } = useLocation();
  const meta = resolvePath(pathname, routeMetadata[pathname]);
  const canonical = meta.canonical || getCanonical(pathname);
  const keywords = [...siteConfig.keywords, ...(meta.keywords || [])];
  const jsonLd = getJsonLd(pathname);

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={meta.ogType || 'website'} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={siteConfig.siteName} />
      <meta property="og:image" content={meta.ogImage || siteConfig.ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteConfig.twitterHandle} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.ogImage || siteConfig.ogImage} />

      <script type="application/ld+json">{jsonLd}</script>
    </Helmet>
  );
}
