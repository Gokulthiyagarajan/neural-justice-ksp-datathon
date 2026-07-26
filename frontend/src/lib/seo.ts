export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  breadcrumb?: { label: string; path: string }[];
}

const BASE_URL = 'https://neural-justice.catalystapps.in';
const SITE_NAME = 'Neural Justice – Karnataka Police AI Intelligence Platform';

export const siteConfig = {
  name: 'Neural Justice',
  shortName: 'NeuralJustice',
  description:
    'Karnataka Police AI-powered crime intelligence, investigation analytics, hotspot detection, criminal network analysis, and predictive policing platform built on Zoho Catalyst.',
  url: BASE_URL,
  siteName: SITE_NAME,
  ogImage: `${BASE_URL}/og-image.png`,
  twitterHandle: '@KarnatakaPolice',
  themeColor: '#0B2A4A',
  keywords: [
    'crime intelligence',
    'AI investigation',
    'police analytics',
    'crime prediction',
    'criminal network',
    'hotspot detection',
    'law enforcement AI',
    'Karnataka Police',
    'KSP Datathon',
    'crime analytics',
    'government AI',
    'investigation platform',
    'predictive policing',
    'criminal intelligence',
    'forensic analytics',
  ],
};

export const routeMetadata: Record<string, SeoMetadata> = {
  '/login': {
    title: 'Sign In – Neural Justice | Karnataka Police AI Platform',
    description:
      'Secure officer login to Neural Justice — Karnataka Police AI crime intelligence and investigation platform.',
    keywords: ['officer login', 'police portal', 'Karnataka Police sign in'],
    canonical: `${BASE_URL}/login`,
  },
  '/': {
    title: 'Dashboard – Neural Justice | Karnataka Police Crime Intelligence',
    description:
      'Real-time crime intelligence dashboard with KPI metrics, incident map, crime trends, and early warning alerts for Karnataka Police.',
    keywords: ['crime dashboard', 'police KPI', 'crime metrics', 'officer dashboard'],
    canonical: `${BASE_URL}/`,
    breadcrumb: [{ label: 'Dashboard', path: '/' }],
  },
  '/firs': {
    title: 'FIR Explorer – Neural Justice | Karnataka Police Case Management',
    description:
      'Search, filter, and explore all First Information Reports (FIRs) with AI-powered case analysis and status tracking.',
    keywords: ['FIR search', 'case management', 'police reports', 'FIR explorer'],
    canonical: `${BASE_URL}/firs`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'FIR Explorer', path: '/firs' },
    ],
  },
  '/firs/:crimeNo': {
    title: 'FIR Detail – Neural Justice | Karnataka Police Case Analysis',
    description:
      'Detailed AI-powered analysis of FIR case with timeline, evidence tracking, suspect network, and case status.',
    keywords: ['FIR detail', 'case analysis', 'crime investigation', 'FIR tracking'],
    canonical: `${BASE_URL}/firs`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'FIR Explorer', path: '/firs' },
      { label: 'Case Detail', path: '' },
    ],
  },
  '/analytics': {
    title: 'Analytics – Neural Justice | Karnataka Police Crime Statistics',
    description:
      'Comprehensive crime analytics with charts, trends, heatmaps, and statistical insights across Karnataka districts.',
    keywords: ['crime analytics', 'crime statistics', 'police analytics dashboard', 'crime trends'],
    canonical: `${BASE_URL}/analytics`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Analytics', path: '/analytics' },
    ],
  },
  '/intelligence/risk': {
    title: 'Risk Scores – Neural Justice | Crime Risk Assessment',
    description:
      'AI-driven crime risk scoring and assessment for Karnataka districts, stations, and crime categories.',
    keywords: ['risk assessment', 'crime risk score', 'predictive policing', 'risk analysis'],
    canonical: `${BASE_URL}/intelligence/risk`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Risk Scores', path: '/intelligence/risk' },
    ],
  },
  '/intelligence/profiles': {
    title: 'Behavior Profiles – Neural Justice | Criminal Behavior Analysis',
    description:
      'AI-powered criminal behavior profiling and pattern analysis for Karnataka Police investigations.',
    keywords: ['behavior profiling', 'criminal analysis', 'suspect profiling', 'crime patterns'],
    canonical: `${BASE_URL}/intelligence/profiles`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Behavior Profiles', path: '/intelligence/profiles' },
    ],
  },
  '/intelligence/patterns': {
    title: 'Crime Patterns – Neural Justice | Crime Pattern Detection',
    description:
      'AI-driven crime pattern detection, modus operandi analysis, and serial crime linkage for Karnataka Police.',
    keywords: ['crime patterns', 'pattern detection', 'serial crimes', 'MO analysis'],
    canonical: `${BASE_URL}/intelligence/patterns`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Crime Patterns', path: '/intelligence/patterns' },
    ],
  },
  '/intelligence/warnings': {
    title: 'Early Warnings – Neural Justice | Predictive Crime Alerts',
    description:
      'AI-generated early warning system for emerging crime hotspots and potential incidents across Karnataka.',
    keywords: ['early warning', 'crime prediction', 'hotspot alert', 'predictive policing'],
    canonical: `${BASE_URL}/intelligence/warnings`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Early Warnings', path: '/intelligence/warnings' },
    ],
  },
  '/intelligence/patrol': {
    title: 'Patrol Recommendations – Neural Justice | Smart Patrol Planning',
    description:
      'AI-optimized patrol route recommendations and resource allocation for Karnataka Police districts.',
    keywords: ['patrol planning', 'police patrol', 'resource allocation', 'smart policing'],
    canonical: `${BASE_URL}/intelligence/patrol`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Patrol', path: '/intelligence/patrol' },
    ],
  },
  '/intelligence/forecast': {
    title: 'Crime Forecast – Neural Justice | Predictive Crime Forecasting',
    description:
      'AI-powered crime forecasting with time-series predictions, seasonal trend analysis, and future incident projections.',
    keywords: ['crime forecast', 'crime prediction', 'predictive analytics', 'crime trends'],
    canonical: `${BASE_URL}/intelligence/forecast`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Forecast', path: '/intelligence/forecast' },
    ],
  },
  '/ai': {
    title: 'AI Copilot – Neural Justice | AI Investigation Assistant',
    description:
      'Conversational AI investigation copilot for Karnataka Police — query cases, patterns, suspects, and get instant intelligence.',
    keywords: ['AI copilot', 'investigation assistant', 'AI chat', 'police AI assistant'],
    canonical: `${BASE_URL}/ai`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'AI Copilot', path: '/ai' },
    ],
  },
  '/geo': {
    title: 'Geo Intelligence – Neural Justice | Crime Mapping & GIS',
    description:
      'Interactive crime mapping, geospatial intelligence, hotspot analysis, and GIS tools for Karnataka Police.',
    keywords: ['crime map', 'GIS intelligence', 'hotspot map', 'geospatial policing'],
    canonical: `${BASE_URL}/geo`,
    breadcrumb: [
      { label: 'Dashboard', path: '/' },
      { label: 'Geo Intelligence', path: '/geo' },
    ],
  },
};

const jsonLdCache: Record<string, string> = {};

export function getJsonLd(pathname: string): string {
  const key = pathname || '/';
  if (jsonLdCache[key]) {return jsonLdCache[key];}

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Karnataka Police',
    alternateName: 'KSP',
    description: 'State law enforcement agency of Karnataka, India. Deploying AI-powered crime intelligence through Neural Justice platform.',
    url: 'https://ksp.karnataka.gov.in',
    department: {
      '@type': 'GovernmentOrganization',
      name: 'Karnataka State Police Cyber Crime Division',
    },
    logo: `${BASE_URL}/favicon-192.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'emergency',
      telephone: '100',
    },
  };

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${BASE_URL}/#softwareapplication`,
    name: 'Neural Justice',
    applicationCategory: 'GovernmentApplication',
    operatingSystem: 'Web',
    description: siteConfig.description,
    url: BASE_URL,
    provider: {
      '@type': 'GovernmentOrganization',
      name: 'Karnataka Police',
    },
    applicationSubCategory: 'Crime Intelligence & Investigation Platform',
    browserRequirements: 'Requires modern browser with JavaScript enabled',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    featureList: [
      'AI-powered crime intelligence',
      'Real-time crime mapping',
      'Predictive policing analytics',
      'Criminal network analysis',
      'FIR management',
      'Early warning system',
      'Patrol optimization',
      'Behavior profiling',
    ],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: SITE_NAME,
    description: siteConfig.description,
    publisher: { '@id': `${BASE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/firs?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: ['en', 'kn'],
  };

  const metadata = routeMetadata[key];

  const governmentServiceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    '@id': `${BASE_URL}/#service`,
    name: 'AI Crime Intelligence Service',
    serviceType: 'Law Enforcement Intelligence',
    provider: { '@id': `${BASE_URL}/#organization` },
    areaServed: {
      '@type': 'State',
      name: 'Karnataka',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Law Enforcement Officers',
    },
  };

  const graphs: Record<string, unknown>[] = [orgJsonLd, softwareJsonLd, websiteJsonLd, governmentServiceJsonLd];

  if (metadata?.breadcrumb) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${BASE_URL}${key}#breadcrumb`,
      itemListElement: metadata.breadcrumb.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.label,
        item: crumb.path ? `${BASE_URL}${crumb.path}` : undefined,
      })),
    });
  }

  const result = JSON.stringify({ '@context': 'https://schema.org', '@graph': graphs });
  jsonLdCache[key] = result;
  return result;
}

export function getCanonical(pathname: string): string {
  const meta = routeMetadata[pathname];
  return meta?.canonical || `${BASE_URL}${pathname}`;
}
