import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Users, Building2, Clock, TrendingUp, Mail, RefreshCw, Gift } from "lucide-react";
import type { SearchReportModalProps } from "./types";

export function SearchReportModal({
  metrics,
  isVisible,
  onClose,
  cachedInfo,
  onRefresh
}: SearchReportModalProps) {
  if (!isVisible) return null;

  const {
    query,
    totalCompanies,
    totalContacts,
    totalEmails,
    searchDuration,
    companies = [],
    sourceBreakdown
  } = metrics;

  // Handle case where companies array is not available (loaded from saved search)
  const hasCompaniesData = companies && companies.length > 0;

  const companiesWithContacts = hasCompaniesData 
    ? companies.filter(company => company.contacts && company.contacts.length > 0).length
    : totalContacts > 0 ? totalCompanies : 0;

  const companiesWithEmails = hasCompaniesData
    ? companies.filter(company => company.contacts?.some(contact => contact.email && contact.email.length > 5)).length
    : (totalEmails ?? 0) > 0 ? Math.min(totalCompanies, totalEmails ?? 0) : 0;

  const averageContactsPerCompany = totalCompanies > 0 
    ? (totalContacts / totalCompanies).toFixed(1) 
    : "0";

  const successRate = totalCompanies > 0 
    ? Math.round((companiesWithContacts / totalCompanies) * 100) 
    : 0;

  const topCompany = hasCompaniesData 
    ? companies.reduce<{ name: string; contacts: any[] }>((max, company) => {
        const contactCount = company.contacts ? company.contacts.length : 0;
        const maxContactCount = max.contacts ? max.contacts.length : 0;
        return contactCount > maxContactCount 
          ? { name: company.name, contacts: company.contacts || [] }
          : max;
      }, { name: "N/A", contacts: [] })
    : null;

  const contactTypes = hasCompaniesData 
    ? companies.reduce((acc, company) => {
        if (!company.contacts) return acc;
        
        company.contacts.forEach((contact: any) => {
          const role = contact.role?.toLowerCase() || "";
          if (role.includes("ceo") || role.includes("cto") || role.includes("cfo") || role.includes("founder") || role.includes("president")) {
            acc.cLevel++;
          } else if (role.includes("manager") || role.includes("director") || role.includes("head") || role.includes("lead")) {
            acc.management++;
          } else {
            acc.staff++;
          }
        });
        
        return acc;
      }, { cLevel: 0, management: 0, staff: 0 })
    : null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <Card className="w-full max-w-md bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Search Summary</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Companies Found:</span>
              <span className="text-sm font-bold text-blue-600">{totalCompanies}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Contacts Discovered:</span>
              <span className="text-sm font-bold text-green-600">{totalContacts}</span>
              <span className="text-xs text-muted-foreground">
                for {companiesWithContacts} of {totalCompanies} companies
              </span>
            </div>
            
            {totalEmails !== undefined && totalEmails > 0 && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium">Emails Found:</span>
                <span className="text-sm font-bold text-indigo-600">{totalEmails}</span>
                <span className="text-xs text-muted-foreground">
                  for {companiesWithEmails} of {totalCompanies} companies
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Success Rate:</span>
              <span className="text-sm font-bold text-purple-600">{successRate}%</span>
            </div>
            
            {!cachedInfo?.isCached && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Search Duration:</span>
                <span className="text-sm font-bold text-orange-600">{formatDuration(searchDuration)}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Query:</span> {query}
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Avg Contacts/Company:</span> {averageContactsPerCompany}
            </div>
            {topCompany && topCompany.name !== "N/A" && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Top Company:</span> {topCompany.name} ({topCompany.contacts?.length || 0} contacts)
              </div>
            )}
            {contactTypes && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Contact Types:</span> C-level: {contactTypes.cLevel}, Management: {contactTypes.management}, Staff: {contactTypes.staff}
              </div>
            )}
            {sourceBreakdown && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Email Sources:</span> Perplexity: {sourceBreakdown.Perplexity || 0} Apollo: {sourceBreakdown.Apollo || 0} Hunter: {sourceBreakdown.Hunter || 0}
              </div>
            )}
          </div>

        </CardContent>

        {cachedInfo?.isCached && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 rounded-b-lg border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-600" />
              <div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Saved search from {cachedInfo.cachedDate ? cachedInfo.cachedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'earlier'}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-500 ml-1">• Free</span>
              </div>
            </div>
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  onClose();
                  onRefresh();
                }}
                className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Search fresh
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
