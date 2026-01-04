import React from 'react';
import { Helmet } from 'react-helmet';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  image?: string;
  type?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: Record<string, any>; // Optional JSON-LD structured data
}

/**
 * SEO component for managing document head metadata
 */
export function SEOHead({
  title = '5Ducks - Sales Gamified | Find Prospects in 5 Minutes a Day',
  description = 'Sales Gamified. Find prospects, craft emails, and close deals in just 5 minutes a day. Delete distractions and enjoy sales simplicity with 5Ducks.',
  canonicalUrl,
  image = 'https://5ducks.ai/images/og-image.png',
  type = 'website',
  twitterCard = 'summary',
  jsonLd,
}: SEOProps) {
  // Construct full title with brand name if not already included
  const fullTitle = title.includes('5Ducks') ? title : `${title} | 5Ducks`;
  
  // Use current URL as canonical if not specified
  const canonical = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph metadata */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      {image && <meta property="og:image" content={image} />}
      
      {/* Twitter Card metadata */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      
      {/* JSON-LD structured data */}
      {jsonLd && (
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
    </Helmet>
  );
}