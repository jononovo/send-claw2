import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchCompanySSR, fetchCompanyContactsSSR } from '@/lib/server-fetch';
import CompanyDetailsClient from './client';

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const companyId = parseInt(id, 10);
  
  if (isNaN(companyId)) {
    return { title: 'Company Not Found | 5Ducks' };
  }
  
  const company = await fetchCompanySSR(companyId);
  
  if (!company) {
    return { title: 'Company Not Found | 5Ducks' };
  }
  
  const title = `${company.name} - Company Profile | 5Ducks`;
  const description = company.description || 
    `View ${company.name} company profile, key contacts, and business information on 5Ducks.`;
  
  const companySlug = company.slug || company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  const canonicalUrl = `https://5ducks.ai/company/${companySlug}/${company.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: '5Ducks',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    other: {
      // JSON-LD will be added in the component
    },
  };
}

// Server Component - fetches data and renders
export default async function CompanyPage({ params }: PageProps) {
  const { id } = await params;
  const companyId = parseInt(id, 10);
  
  if (isNaN(companyId)) {
    notFound();
  }

  // Fetch company and contacts in parallel
  const [company, contacts] = await Promise.all([
    fetchCompanySSR(companyId),
    fetchCompanyContactsSSR(companyId),
  ]);

  if (!company) {
    notFound();
  }

  // Generate JSON-LD structured data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": company.name,
    "description": company.description || `${company.name} - B2B company profile`,
    "url": company.website || `https://5ducks.ai/company/${company.slug || company.id}/${company.id}`,
    ...(company.size && { "numberOfEmployees": { "@type": "QuantitativeValue", "value": company.size } }),
  };

  return (
    <>
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      
      {/* Client component handles all interactivity */}
      <CompanyDetailsClient 
        company={company} 
        initialContacts={contacts} 
      />
    </>
  );
}
