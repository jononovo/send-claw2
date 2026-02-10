export type BotStatus = 'normal' | 'flagged' | 'under_review' | 'suspended';

export interface FlaggedEmail {
  id: string;
  status: 'flagged' | 'under_review' | 'suspended';
  reason: string;
}

export interface AIReviewResult {
  flagged: FlaggedEmail[];
}

export interface EmailForReview {
  id: string;
  botId: string;
  botName: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  createdAt: Date;
}

export interface DailyStats {
  emailsInbound: number;
  emailsOutbound: number;
  newBots: number;
  botsClaimed: number;
}

export interface FlaggedEmailReport {
  messageId: string;
  botId: string;
  botName: string;
  botAddress: string;
  toEmail: string;
  subject: string;
  bodyPreview: string;
  suggestedStatus: string;
  reason: string;
  createdAt: string;
}

export interface SecurityReportData {
  date: string;
  stats: DailyStats;
  flaggedEmails: FlaggedEmailReport[];
  allSubjectLines: string[];
}
