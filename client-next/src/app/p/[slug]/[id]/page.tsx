import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchContactSSR, fetchCompanySSR } from '@/lib/server-fetch';
import ContactDetailsClient from './client';

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const contactId = parseInt(id, 10);
  
  if (isNaN(contactId)) {
    return { title: 'Contact Not Found | 5Ducks' };
  }
  
  const contact = await fetchContactSSR(contactId);
  
  if (!contact) {
    return { title: 'Contact Not Found | 5Ducks' };
  }
  
  // Fetch company for additional context
  const company = contact.companyId 
    ? await fetchCompanySSR(contact.companyId) 
    : null;
  
  const title = `${contact.name}${contact.role ? ` - ${contact.role}` : ''}${company ? ` at ${company.name}` : ''} | 5Ducks`;
  const description = `Contact profile for ${contact.name}${contact.role ? `, ${contact.role}` : ''}${company ? ` at ${company.name}` : ''}. Find professional contact information on 5Ducks.`;
  
  const contactSlug = contact.slug || `${contact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}${company ? `-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}` : ''}`.substring(0, 50);
  const canonicalUrl = `https://5ducks.ai/p/${contactSlug}/${contact.id}`;

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
  };
}

// Server Component - fetches data and renders
export default async function ContactPage({ params }: PageProps) {
  const { id } = await params;
  const contactId = parseInt(id, 10);
  
  if (isNaN(contactId)) {
    notFound();
  }

  const contact = await fetchContactSSR(contactId);

  if (!contact) {
    notFound();
  }

  // Fetch company data if contact has a company
  const company = contact.companyId 
    ? await fetchCompanySSR(contact.companyId) 
    : null;

  // Generate JSON-LD structured data
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": contact.name,
    ...(contact.role && { "jobTitle": contact.role }),
    ...(company && { "worksFor": { "@type": "Organization", "name": company.name } }),
  };

  return (
    <>
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      
      {/* Client component handles all interactivity */}
      <ContactDetailsClient 
        contact={contact} 
        company={company} 
      />
    </>
  );
}
