import type {
  Campaign,
  CommunicationHistory,
  Company,
  Contact,
  ContactList,
  DailyOutreachBatch,
  DailyOutreachItem,
  SearchJob,
  SearchList,
  StrategicProfile,
} from "@shared/schema";

/**
 * Every response shape the agent API returns is defined here, so internal columns never leak
 * and each shape changes in one place.
 */

export const FAILED_RECIPIENT_STATUSES = ["failed_generation", "failed_send", "bounced", "manual_send_required"];

function parseJsonStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function serializeContactForAgent(contact: Contact) {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role,
    email: contact.email,
    alternativeEmails: contact.alternativeEmails ?? [],
    emailConfidence: contact.probability,
    linkedinUrl: contact.linkedinUrl,
    phoneNumber: contact.phoneNumber,
    department: contact.department,
    location: contact.location,
  };
}

export function serializeCompanyForAgent(company: Company, contacts: Contact[]) {
  return {
    id: company.id,
    name: company.name,
    website: company.website,
    description: company.description,
    city: company.city,
    state: company.state,
    country: company.country,
    size: company.size,
    services: company.services ?? [],
    contacts: contacts.map(serializeContactForAgent),
  };
}

export function serializeSavedSearchSummaryForAgent(savedSearch: SearchList) {
  return {
    savedSearchId: savedSearch.listId,
    query: savedSearch.prompt,
    strategyId: savedSearch.strategyId ?? null,
    resultCount: savedSearch.resultCount,
    totalContacts: savedSearch.totalContacts,
    totalEmails: savedSearch.totalEmails,
    createdAt: savedSearch.createdAt,
  };
}

export function serializeSavedSearchForAgent(savedSearch: SearchList, companies: Company[], contacts: Contact[]) {
  return {
    ...serializeSavedSearchSummaryForAgent(savedSearch),
    companies: companies.map((company) =>
      serializeCompanyForAgent(company, contacts.filter((contact) => contact.companyId === company.id)),
    ),
  };
}

export type AgentSavedSearch = ReturnType<typeof serializeSavedSearchForAgent>;

export function serializeSearchJobForAgent(job: SearchJob, savedSearch: AgentSavedSearch | null) {
  const metadata = (job.metadata ?? {}) as Record<string, any>;
  const results = (job.results ?? {}) as Record<string, any>;
  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    query: job.query,
    type: job.searchType,
    strategyId: metadata.strategyId ?? null,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    savedSearchId: results.savedSearchId ?? null,
    savedSearch,
  };
}

export function serializeCampaignForAgent(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    strategyId: campaign.strategicProfileId,
    contactListId: campaign.contactListId,
    senderProfileId: campaign.senderProfileId,
    requiresHumanReview: campaign.requiresHumanReview,
    autopilotEnabled: campaign.autopilotEnabled,
    maxEmailsPerDay: campaign.maxEmailsPerDay,
    delayBetweenEmailsMinutes: campaign.delayBetweenEmails,
    scheduleDate: campaign.scheduleDate,
    scheduleTime: campaign.scheduleTime,
    timezone: campaign.timezone,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdAt: campaign.createdAt,
  };
}

export function serializeStrategyForAgent(strategy: StrategicProfile, campaigns: Campaign[]) {
  return {
    id: strategy.id,
    title: strategy.title,
    businessType: strategy.businessType,
    productService: strategy.productService,
    targetCustomers: strategy.targetCustomers,
    strategyBoundary: strategy.strategyHighLevelBoundary,
    suggestedDailyQueries: parseJsonStringArray(strategy.dailySearchQueries),
    searchPrompts: strategy.searchPrompts ?? [],
    status: strategy.status,
    campaigns: campaigns.map(serializeCampaignForAgent),
  };
}

/** Takes the result of storage.getCampaignWithMetrics and drops its recipient list and email bodies. */
export function serializeCampaignStatsForAgent(campaignWithMetrics: any) {
  return {
    ...serializeCampaignForAgent(campaignWithMetrics as Campaign),
    contactListName: campaignWithMetrics.contactListName ?? null,
    metrics: {
      totalRecipients: campaignWithMetrics.totalRecipients,
      sent: campaignWithMetrics.emailsSent,
      opened: campaignWithMetrics.emailsOpened,
      clicked: campaignWithMetrics.emailsClicked,
      replied: campaignWithMetrics.emailsReplied,
      bounced: campaignWithMetrics.emailsBounced,
      unsubscribed: campaignWithMetrics.emailsUnsubscribed,
      inReview: campaignWithMetrics.reviewCount,
      openRate: campaignWithMetrics.openRate,
      clickRate: campaignWithMetrics.clickRate,
      replyRate: campaignWithMetrics.replyRate,
      bounceRate: campaignWithMetrics.bounceRate,
      unsubscribeRate: campaignWithMetrics.unsubscribeRate,
    },
  };
}

/** Takes one entry of getCampaignWithMetrics().recipients. */
export function serializeRecipientForAgent(recipient: any) {
  return {
    id: recipient.id,
    email: recipient.email,
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    company: recipient.companyName,
    status: recipient.status,
    subject: recipient.emailSubject,
    sentAt: recipient.sentAt,
    openedAt: recipient.openedAt,
    clickedAt: recipient.clickedAt,
    repliedAt: recipient.repliedAt,
    bouncedAt: recipient.bouncedAt,
    unsubscribedAt: recipient.unsubscribedAt,
    error: recipient.errorMessage ?? null,
  };
}

export function serializeContactListForAgent(contactList: ContactList) {
  return {
    id: contactList.id,
    name: contactList.name,
    description: contactList.description,
    contactCount: contactList.contactCount,
    isDefault: contactList.isDefault,
    createdAt: contactList.createdAt,
  };
}

/** Takes one entry of storage.listContactsByListId. */
export function serializeListMemberForAgent(member: any) {
  return {
    contactId: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    company: member.company?.name ?? null,
    companyWebsite: member.company?.website ?? null,
    contactStatus: member.contactStatus,
    lastContactedAt: member.lastContactedAt,
    addedFrom: member.source,
    addedFromDetails: member.sourceMetadata ?? null,
    addedAt: member.addedAt,
  };
}

export function serializeCommunicationForAgent(communication: CommunicationHistory) {
  return {
    id: communication.id,
    channel: communication.channel,
    direction: communication.direction,
    status: communication.status,
    subject: communication.subject,
    preview: communication.contentPreview,
    campaignId: communication.campaignId,
    dailyOutreachBatchId: communication.batchId,
    sentAt: communication.sentAt,
    openedAt: communication.openedAt,
    repliedAt: communication.repliedAt,
    createdAt: communication.createdAt,
  };
}

export function serializeDailyOutreachBatchForAgent(batch: DailyOutreachBatch, items: DailyOutreachItem[]) {
  return {
    id: batch.id,
    batchDate: batch.batchDate,
    status: batch.status,
    expiresAt: batch.expiresAt,
    drafts: items.map((item) => ({
      id: item.id,
      contactId: item.contactId,
      companyId: item.companyId,
      subject: item.emailSubject,
      tone: item.emailTone,
      status: item.status,
      sentAt: item.sentAt,
    })),
  };
}
