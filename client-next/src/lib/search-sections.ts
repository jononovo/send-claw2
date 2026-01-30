import type { SearchSection } from "@shared/schema";

// Core search subsections
export const SEARCH_SUBSECTIONS = {
  // Company Overview specific subsections
  companyProfile: {
    id: "company-profile",
    label: "Company Profile",
    description: "Basic company information and overview",
    implementation: "Analyze company details including size, age, and focus"
  },
  businessValidation: {
    id: "business-validation",
    label: "Business Validation",
    description: "Verify business legitimacy and operations",
    implementation: "Validate business operations and legitimacy"
  },

  // Decision Maker specific subsections
  leadershipSearch: {
    id: "leadership-search",
    label: "Leadership Team",
    description: "Search for company leadership and decision makers",
    implementation: "Search leadership profiles and roles"
  },
  roleVerification: {
    id: "role-verification",
    label: "Role Verification",
    description: "Verify roles and responsibilities",
    implementation: "Validate decision maker roles"
  },

  // Email Discovery Subsections
  websiteEmailSearch: {
    id: "website-email-search",
    label: "Website Email Search",
    description: "Extract email addresses from company website",
    implementation: "Search company website for email addresses"
  },
  patternPrediction: {
    id: "pattern-prediction",
    label: "Pattern Prediction",
    description: "Predict email patterns",
    implementation: "Analyze and predict company email patterns"
  },

  // Email Enrichment Subsections
  emailValidation: {
    id: "email-validation",
    label: "Email Validation",
    description: "Validate discovered email addresses",
    implementation: "Validate email addresses and patterns"
  },
  contactEnrichment: {
    id: "contact-enrichment",
    label: "Contact Enrichment",
    description: "Enrich contact information",
    implementation: "Enrich contact details with additional data"
  },

  // Email Deepdive Subsections
  localSourcesSearch: {
    id: "local-sources-search",
    label: "Local Sources",
    description: "Search local business sources",
    implementation: "Search local business directories and sources"
  },
  digitalSourcesSearch: {
    id: "digital-sources-search",
    label: "Digital Sources",
    description: "Search digital platforms",
    implementation: "Search digital platforms and social media"
  }
};

// Core section configurations
export const SECTIONS_CONFIG = {
  company_overview: {
    basic_info: {
      id: "basic_info",
      label: "Basic Information",
      description: "Company profile and validation",
      subsectionIds: ["company-profile", "business-validation"]
    }
  },
  decision_maker: {
    leadership_search: {
      id: "leadership_search",
      label: "Leadership Search",
      description: "Search and verify company leadership",
      subsectionIds: ["leadership-search", "role-verification"]
    }
  },
  email_discovery: {
    basic_discovery: {
      id: "basic_discovery",
      label: "Basic Discovery",
      description: "Basic email discovery methods",
      subsectionIds: ["website-email-search", "pattern-prediction"]
    }
  },
  email_enrichment: {
    validation: {
      id: "validation",
      label: "Validation & Enrichment",
      description: "Email validation and contact enrichment",
      subsectionIds: ["email-validation", "contact-enrichment"]
    }
  },
  email_deepdive: {
    sources: {
      id: "sources",
      label: "Source Analysis",
      description: "Deep search in various sources",
      subsectionIds: ["local-sources-search", "digital-sources-search"]
    }
  }
};

// Helper function to get subsections for a section
export function getSubsectionsForSection(sectionConfig: {
  id: string;
  label: string;
  description: string;
  subsectionIds: string[];
}): Array<{
  id: string;
  label: string;
  description: string;
  implementation?: string;
}> {
  return sectionConfig.subsectionIds
    .map(id => {
      const subsection = SEARCH_SUBSECTIONS[id as keyof typeof SEARCH_SUBSECTIONS];
      if (!subsection) {
        console.warn(`Subsection ${id} not found`);
        return null;
      }
      return subsection;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// Get sections for a specific module type
export function getSectionsByModuleType(moduleType: string): Record<string, SearchSection> {
  const validModuleTypes = [
    'company_overview',
    'decision_maker',
    'email_discovery',
    'email_enrichment',
    'email_deepdive'
  ];

  if (!validModuleTypes.includes(moduleType)) {
    console.warn(`Invalid module type: ${moduleType}`);
    return {};
  }

  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  if (!moduleConfig) {
    console.warn(`No config found for module type: ${moduleType}`);
    return {};
  }

  const result: Record<string, SearchSection> = {};

  Object.entries(moduleConfig).forEach(([sectionId, sectionConfig]) => {
    const searches = getSubsectionsForSection(sectionConfig);

    if (searches.length > 0) {
      result[sectionId] = {
        id: sectionConfig.id,
        label: sectionConfig.label,
        description: sectionConfig.description,
        searches
      };
    }
  });

  return result;
}

// Get all search IDs for a module type
export function getAllSearchIds(moduleType: string): string[] {
  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  return moduleConfig ? Object.values(moduleConfig).flatMap(section => section.subsectionIds) : [];
}