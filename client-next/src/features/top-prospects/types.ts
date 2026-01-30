import type { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface TopProspectsCardProps {
  prospects: ContactWithCompanyInfo[];
  pendingComprehensiveSearchIds?: Set<number>;
  isVisible: boolean;
  onContactView: (contact: { id: number; slug?: string | null; name: string }) => void;
  onContactFeedback: (contactId: number, feedbackType: "excellent" | "terrible") => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
}
