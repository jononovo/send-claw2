import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePagination } from "@/hooks/use-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Building2,
  UserPlus,
  Mail,
  Briefcase,
  Upload,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ContactList, Contact, SearchList, Company } from "@shared/schema";
import Papa from "papaparse";

interface ContactWithCompany extends Contact {
  company?: {
    name: string;
    website?: string;
  };
}

export default function ContactListDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [addContactsModalOpen, setAddContactsModalOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<'search-list' | 'companies' | 'manual' | 'import-csv' | null>(null);
  const [selectedSearchList, setSelectedSearchList] = useState<string>("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [maxContactsPerCompany, setMaxContactsPerCompany] = useState(3);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [selectedManualContacts, setSelectedManualContacts] = useState<number[]>([]);
  const [manualContactSearchTerm, setManualContactSearchTerm] = useState("");
  
  // CSV import state
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);

  // Fetch the contact list details
  const { data: contactList, isLoading: listLoading } = useQuery<ContactList>({
    queryKey: ["/api/contact-lists", id],
    enabled: !!user && !!id,
  });

  // Fetch contacts in the list
  const { 
    data: contacts = [], 
    isLoading: contactsLoading,
    refetch: refetchContacts
  } = useQuery<ContactWithCompany[]>({
    queryKey: [`/api/contact-lists/${id}/contacts`],
    enabled: !!user && !!id,
  });

  // Use pagination hook for contacts
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedContacts,
    handlePreviousPage,
    handleNextPage,
  } = usePagination(contacts, { itemsPerPage: 10 });

  // Fetch available search lists for the "Add from Search List" option
  const { data: searchLists = [] } = useQuery<SearchList[]>({
    queryKey: ["/api/lists"],
    enabled: !!user && addMethod === 'search-list',
  });

  // Fetch all companies for the "Add from Companies" option
  const { data: allCompanies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    enabled: !!user && addMethod === 'companies',
  });

  // Query all contacts for "Add Manually" method
  const { data: allContactsData } = useQuery<{ total: number; contacts: (Contact & { companyName?: string })[] }>({
    queryKey: ["/api/contacts"],
    enabled: !!user && addMethod === 'manual',
  });
  const allContacts = allContactsData?.contacts || [];

  // Mutation to add contacts from a search list
  const addFromSearchListMutation = useMutation({
    mutationFn: async (searchListId: number) => {
      const response = await apiRequest(
        "POST", 
        `/api/contact-lists/${id}/add-from-search-list`,
        { searchListId }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Added ${data.added} contacts to the list`,
      });
      refetchContacts();
      setAddContactsModalOpen(false);
      setAddMethod(null);
      setSelectedSearchList("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contacts",
        variant: "destructive",
      });
    },
  });

  // Mutation to add contacts from companies
  const addFromCompaniesMutation = useMutation({
    mutationFn: async ({ companyIds, maxContacts }: { companyIds: number[]; maxContacts: number }) => {
      const response = await apiRequest(
        "POST",
        `/api/contact-lists/${id}/add-from-companies`,
        { 
          companyIds,
          maxContactsPerCompany: maxContacts
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Added ${data.addedCount || 0} contacts to the list`,
      });
      refetchContacts();
      setAddContactsModalOpen(false);
      setAddMethod(null);
      setSelectedCompanies([]);
      setMaxContactsPerCompany(3);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contacts from companies",
        variant: "destructive",
      });
    },
  });

  // Mutation to add manual contacts
  const addManualContactsMutation = useMutation({
    mutationFn: async (contactIds: number[]) => {
      const response = await apiRequest(
        "POST",
        `/api/contact-lists/${id}/contacts`,
        { 
          contactIds,
          source: 'manual'
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Added ${selectedManualContacts.length} contacts to the list`,
      });
      refetchContacts();
      setAddContactsModalOpen(false);
      setAddMethod(null);
      setSelectedManualContacts([]);
      setManualContactSearchTerm("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add selected contacts",
        variant: "destructive",
      });
    },
  });

  // Mutation to remove contacts
  const removeContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/contact-lists/${id}/contacts`,
        { contactIds: [contactId] }
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact removed from list",
      });
      refetchContacts();
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to remove contact",
        variant: "destructive",
      });
    },
  });

  // Mutation to import contacts from CSV
  const importCsvMutation = useMutation({
    mutationFn: async (contacts: any[]) => {
      const response = await apiRequest(
        "POST",
        `/api/contact-lists/${id}/import-csv`,
        { contacts }
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Successfully imported ${data.imported || 0} contacts`,
      });
      refetchContacts();
      setAddContactsModalOpen(false);
      setAddMethod(null);
      setCsvText("");
      setCsvFile(null);
      setParsedContacts([]);
      setCsvParseError(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to import contacts",
        variant: "destructive",
      });
    },
  });

  // Parse CSV text into contact objects
  const parseCSV = (text: string) => {
    try {
      setCsvParseError(null);
      
      // Check if the text appears to be missing headers (no header-like text in first row)
      const lines = text.trim().split('\n');
      const firstLine = lines[0] || '';
      const hasHeaders = firstLine.toLowerCase().includes('name') || 
                        firstLine.toLowerCase().includes('email') ||
                        firstLine.toLowerCase().includes('company');
      
      // If no headers detected, prepend them
      let csvTextToParse = text;
      if (!hasHeaders && lines.length > 0) {
        // Check if the first line looks like data (has @ for email in first position)
        const firstLineValues = firstLine.split(',').map(v => v.trim());
        if (firstLineValues.length >= 2 && firstLineValues[0].includes('@')) {
          // Auto-add headers based on the actual number of fields
          // Common formats:
          // 2 fields: email, name
          // 3 fields: email, first_name, last_name
          // 4 fields: email, first_name, last_name, company
          // 5 fields: email, first_name, last_name, company, role
          // 6 fields: email, first_name, last_name, company, role, city
          
          let headers = 'email, first_name';
          if (firstLineValues.length === 3) {
            headers = 'email, first_name, last_name';
          } else if (firstLineValues.length === 4) {
            headers = 'email, first_name, last_name, company';
          } else if (firstLineValues.length === 5) {
            headers = 'email, first_name, last_name, company, role';
          } else if (firstLineValues.length >= 6) {
            headers = 'email, first_name, last_name, company, role, city';
          }
          csvTextToParse = headers + '\n' + text;
        }
      }
      
      // Parse CSV using papaparse
      const result = Papa.parse<Record<string, string>>(csvTextToParse, {
        header: true, // First row contains headers
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(' ', '_'), // Convert "first name" to "first_name"
      });

      if (result.errors.length > 0) {
        // Filter out "TooFewFields" errors since optional fields are allowed to be missing
        const significantErrors = result.errors.filter(error => 
          error.code !== 'TooFewFields'
        );
        
        if (significantErrors.length > 0) {
          // Report the first significant parsing error
          const firstError = significantErrors[0];
          setCsvParseError(`CSV parsing error at row ${firstError.row}: ${firstError.message}`);
          return;
        }
      }

      if (result.data.length === 0) {
        setCsvParseError("CSV must contain at least one data row");
        return;
      }

      // Check required headers (only email and first_name are required now)
      const requiredHeaders = ['email', 'first_name'];
      const headers = Object.keys(result.data[0] || {});
      
      // Check if required headers are present
      for (const required of requiredHeaders) {
        if (!headers.includes(required)) {
          setCsvParseError(`Missing required header: ${required}`);
          return;
        }
      }

      // Parse data rows
      const contacts = [];
      for (const row of result.data) {
        // Get values with defaults for optional fields
        const email = (row['email'] || '').toString().trim();
        const firstName = (row['first_name'] || '').toString().trim();
        const lastName = (row['last_name'] || '').toString().trim();
        const company = (row['company'] || '').toString().trim();
        const role = (row['role'] || '').toString().trim();
        const city = (row['city'] || '').toString().trim();
        
        // Skip rows without required fields
        if (!email || !firstName) {
          continue;
        }

        const contact = {
          name: lastName ? `${firstName} ${lastName}`.trim() : firstName,
          email: email,
          // Only include optional fields if they have values
          ...(company && { company }),
          ...(role && { role }),
          ...(city && { city }),
        };

        contacts.push(contact);
      }

      if (contacts.length === 0) {
        setCsvParseError("No valid contacts found in CSV (all rows missing required fields: email and/or first_name)");
        return;
      }

      setParsedContacts(contacts);
    } catch (error) {
      setCsvParseError(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  // Download CSV template
  const downloadCSVTemplate = () => {
    const template = `email,first_name,last_name,company,role,city
john@example.com,John,Doe,Acme Inc,CEO,New York
jane@company.com,Jane,Smith,Tech Corp,CTO,Boston
bob@startup.com,Bob,Johnson,StartupCo,VP Sales,Austin`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddContacts = () => {
    if (addMethod === 'search-list' && selectedSearchList) {
      setIsAddingContacts(true);
      addFromSearchListMutation.mutate(parseInt(selectedSearchList));
    } else if (addMethod === 'companies' && selectedCompanies.length > 0) {
      setIsAddingContacts(true);
      addFromCompaniesMutation.mutate({
        companyIds: selectedCompanies.map(id => parseInt(id)),
        maxContacts: maxContactsPerCompany
      });
    } else if (addMethod === 'manual' && selectedManualContacts.length > 0) {
      setIsAddingContacts(true);
      addManualContactsMutation.mutate(selectedManualContacts);
    } else if (addMethod === 'import-csv' && parsedContacts.length > 0) {
      setIsAddingContacts(true);
      importCsvMutation.mutate(parsedContacts);
    }
  };

  const handleRemoveContact = (contactId: number) => {
    setContactToDelete(contactId);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDeleteContact = () => {
    if (contactToDelete) {
      removeContactMutation.mutate(contactToDelete);
    }
    setDeleteConfirmOpen(false);
    setContactToDelete(null);
  };

  useEffect(() => {
    if (addFromSearchListMutation.isSuccess || addFromSearchListMutation.isError ||
        addFromCompaniesMutation.isSuccess || addFromCompaniesMutation.isError ||
        addManualContactsMutation.isSuccess || addManualContactsMutation.isError ||
        importCsvMutation.isSuccess || importCsvMutation.isError) {
      setIsAddingContacts(false);
    }
  }, [addFromSearchListMutation.isSuccess, addFromSearchListMutation.isError,
      addFromCompaniesMutation.isSuccess, addFromCompaniesMutation.isError,
      addManualContactsMutation.isSuccess, addManualContactsMutation.isError,
      importCsvMutation.isSuccess, importCsvMutation.isError]);

  if (listLoading || contactsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!contactList) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Contact list not found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/contacts")}
              data-testid="button-back-to-contacts"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Compact header with everything on one row */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/contacts")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Badge>
          
          <Button
            onClick={() => setAddContactsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-add-contacts"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contacts
          </Button>
        </div>
      </div>

      {/* List name and description */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-list-name">
          {contactList.name}
        </h1>
        {contactList.description && (
          <p className="text-muted-foreground mt-2" data-testid="text-list-description">
            {contactList.description}
          </p>
        )}
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="pt-6">
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No contacts in this list yet
              </p>
              <Button
                variant="outline"
                onClick={() => setAddContactsModalOpen(true)}
                data-testid="button-add-first-contacts"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contacts
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.map((contact) => (
                  <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                    <TableCell className="font-medium">
                      {contact.name}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <span className="text-sm">{contact.email}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.company?.name ? (
                        <span>{contact.company.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.role ? (
                        <span>{contact.role}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveContact(contact.id)}
                        disabled={removeContactMutation.isPending}
                        data-testid={`button-remove-${contact.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground">
                Viewing {startIndex + 1}—
                {Math.min(endIndex, contacts.length)} over{" "}
                {contacts.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contacts Modal */}
      <Dialog open={addContactsModalOpen} onOpenChange={setAddContactsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Contacts to List</DialogTitle>
            <DialogDescription>
              Choose how you want to add contacts to this list
            </DialogDescription>
          </DialogHeader>

          {!addMethod ? (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAddMethod('search-list')}
                data-testid="button-add-from-search"
              >
                <Users className="h-4 w-4 mr-2" />
                Add from Search List
                <span className="text-xs text-muted-foreground ml-auto">
                  Import from existing searches
                </span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAddMethod('companies')}
                data-testid="button-add-from-companies"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Add from Companies
                <span className="text-xs text-muted-foreground ml-auto">
                  Top 3 contacts per company
                </span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAddMethod('manual')}
                data-testid="button-add-manually"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually
                <span className="text-xs text-muted-foreground ml-auto">
                  Select individual contacts
                </span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAddMethod('import-csv')}
                data-testid="button-import-csv"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Paste or Import
                <span className="text-xs text-muted-foreground ml-auto">
                  Bulk import from CSV
                </span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {addMethod === 'search-list' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select a Search List
                    </label>
                    <Select
                      value={selectedSearchList}
                      onValueChange={setSelectedSearchList}
                    >
                      <SelectTrigger data-testid="select-search-list">
                        <SelectValue placeholder="Choose a search list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {searchLists.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No search lists available
                          </div>
                        ) : (
                          searchLists.map((list) => (
                            <SelectItem 
                              key={list.id} 
                              value={list.listId.toString()}
                              data-testid={`option-list-${list.listId}`}
                            >
                              {list.prompt} ({list.resultCount} results)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This will add all contacts from the selected search list
                    </p>
                  </div>
                </>
              )}

              {addMethod === 'companies' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Search Companies</label>
                    <Input
                      type="text"
                      placeholder="Search by company name..."
                      value={companySearchTerm}
                      onChange={(e) => setCompanySearchTerm(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Select Companies</label>
                    <div className="mt-2 max-h-64 overflow-y-auto border rounded-md p-2">
                      {allCompanies
                        .filter(company => 
                          company.name?.toLowerCase().includes(companySearchTerm.toLowerCase())
                        )
                        .map((company) => (
                          <div key={company.id} className="flex items-center p-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`company-${company.id}`}
                              checked={selectedCompanies.includes(company.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCompanies([...selectedCompanies, company.id.toString()]);
                                } else {
                                  setSelectedCompanies(selectedCompanies.filter(id => id !== company.id.toString()));
                                }
                              }}
                              className="mr-2"
                            />
                            <label 
                              htmlFor={`company-${company.id}`} 
                              className="flex-1 cursor-pointer"
                            >
                              <span className="font-medium">{company.name}</span>
                              {company.description && (
                                <span className="text-sm text-gray-500 ml-2">
                                  - {company.description.substring(0, 50)}...
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      {allCompanies.filter(c => c.name?.toLowerCase().includes(companySearchTerm.toLowerCase())).length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">No companies found</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Max Contacts Per Company</label>
                    <Select
                      value={maxContactsPerCompany.toString()}
                      onValueChange={(value) => setMaxContactsPerCompany(parseInt(value))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 contact</SelectItem>
                        <SelectItem value="2">2 contacts</SelectItem>
                        <SelectItem value="3">3 contacts</SelectItem>
                        <SelectItem value="5">5 contacts</SelectItem>
                        <SelectItem value="10">10 contacts</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Will add the top {maxContactsPerCompany} contact{maxContactsPerCompany > 1 ? 's' : ''} from each selected company
                    </p>
                  </div>
                  
                  {selectedCompanies.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedCompanies.length} {selectedCompanies.length === 1 ? 'company' : 'companies'}
                    </div>
                  )}
                </div>
              )}

              {addMethod === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Search Contacts</label>
                    <Input
                      type="text"
                      placeholder="Search by name, email, or company..."
                      value={manualContactSearchTerm}
                      onChange={(e) => setManualContactSearchTerm(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Select Contacts</label>
                    <div className="mt-2 max-h-64 overflow-y-auto border rounded-md p-2">
                      {allContacts
                        .filter(contact => {
                          const searchLower = manualContactSearchTerm.toLowerCase();
                          return (
                            contact.name?.toLowerCase().includes(searchLower) ||
                            contact.email?.toLowerCase().includes(searchLower) ||
                            contact.companyName?.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((contact) => (
                          <div key={contact.id} className="flex items-center p-2 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`contact-${contact.id}`}
                              checked={selectedManualContacts.includes(contact.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedManualContacts([...selectedManualContacts, contact.id]);
                                } else {
                                  setSelectedManualContacts(selectedManualContacts.filter(id => id !== contact.id));
                                }
                              }}
                              className="mr-2"
                            />
                            <label 
                              htmlFor={`contact-${contact.id}`} 
                              className="flex-1 cursor-pointer"
                            >
                              <div>
                                <span className="font-medium">{contact.name}</span>
                                {contact.email && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    - {contact.email}
                                  </span>
                                )}
                              </div>
                              {contact.companyName && (
                                <div className="text-xs text-gray-500">{contact.companyName}</div>
                              )}
                            </label>
                          </div>
                        ))}
                      {allContacts.filter(c => {
                        const searchLower = manualContactSearchTerm.toLowerCase();
                        return (
                          c.name?.toLowerCase().includes(searchLower) ||
                          c.email?.toLowerCase().includes(searchLower) ||
                          c.companyName?.toLowerCase().includes(searchLower)
                        );
                      }).length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">
                          {allContacts.length === 0 ? "Loading contacts..." : "No contacts found"}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedManualContacts.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Selected: {selectedManualContacts.length} {selectedManualContacts.length === 1 ? 'contact' : 'contacts'}
                    </div>
                  )}
                </div>
              )}

              {addMethod === 'import-csv' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">CSV Format Requirements</label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs text-gray-600">
                      <code>email, first_name, last_name, company, role, city</code>
                      <p className="mt-2">Simple examples (headers auto-added):</p>
                      <code className="block">john@example.com, John</code>
                      <code className="block">jane@company.com, Jane, Smith, Acme Inc, CEO, NYC</code>
                      <p className="mt-2 text-green-600">✓ Only email and first name are required!</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Paste CSV Data</label>
                    <textarea
                      placeholder="Paste your CSV data here...&#10;Examples:&#10;john@example.com, John&#10;jane@company.com, Jane, Smith&#10;bob@acme.com, Bob, Johnson, Acme Inc, CEO, NYC&#10;&#10;Or with headers:&#10;email, first_name, last_name, company, role, city&#10;alice@test.com, Alice, Lee, Tech Corp, CTO, Boston"
                      value={csvText}
                      onChange={(e) => {
                        setCsvText(e.target.value);
                        if (e.target.value) {
                          parseCSV(e.target.value);
                        } else {
                          setParsedContacts([]);
                          setCsvParseError(null);
                        }
                      }}
                      className="mt-2 w-full h-32 p-2 border rounded-md font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center">
                    <div className="flex-1 border-t"></div>
                    <span className="px-2 text-sm text-gray-500">OR</span>
                    <div className="flex-1 border-t"></div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Upload CSV File</label>
                    <div className="mt-2">
                      <label
                        htmlFor="csv-upload"
                        className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-md cursor-pointer hover:border-gray-400 transition-colors"
                      >
                        <Upload className="h-5 w-5 mr-2 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {csvFile ? csvFile.name : "Choose CSV file or drag and drop"}
                        </span>
                      </label>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      <button
                        type="button"
                        onClick={downloadCSVTemplate}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Download CSV template
                      </button>
                    </p>
                  </div>

                  {csvParseError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                      {csvParseError}
                    </div>
                  )}

                  {parsedContacts.length > 0 && !csvParseError && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600">
                        ✓ Successfully parsed {parsedContacts.length} contact{parsedContacts.length !== 1 ? 's' : ''}
                      </p>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-1">Name</th>
                              <th className="text-left p-1">Email</th>
                              <th className="text-left p-1">Company</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedContacts.slice(0, 5).map((contact, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-1">{contact.name}</td>
                                <td className="p-1">{contact.email}</td>
                                <td className="p-1">{contact.company || '-'}</td>
                              </tr>
                            ))}
                            {parsedContacts.length > 5 && (
                              <tr>
                                <td colSpan={3} className="p-1 text-center text-gray-500">
                                  ...and {parsedContacts.length - 5} more
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddMethod(null);
                    setSelectedSearchList("");
                    setSelectedCompanies([]);
                    setCompanySearchTerm("");
                    setMaxContactsPerCompany(3);
                    setSelectedManualContacts([]);
                    setManualContactSearchTerm("");
                    setCsvText("");
                    setCsvFile(null);
                    setParsedContacts([]);
                    setCsvParseError(null);
                  }}
                  disabled={isAddingContacts}
                  data-testid="button-back-to-methods"
                >
                  Back
                </Button>

                {addMethod === 'search-list' && (
                  <Button
                    onClick={handleAddContacts}
                    disabled={!selectedSearchList || isAddingContacts}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-confirm-add"
                  >
                    {isAddingContacts ? "Adding..." : "Add Contacts"}
                  </Button>
                )}

                {addMethod === 'companies' && (
                  <Button
                    onClick={handleAddContacts}
                    disabled={selectedCompanies.length === 0 || isAddingContacts}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-confirm-add-companies"
                  >
                    {isAddingContacts ? "Adding..." : `Add Contacts from ${selectedCompanies.length} ${selectedCompanies.length === 1 ? 'Company' : 'Companies'}`}
                  </Button>
                )}

                {addMethod === 'manual' && (
                  <Button
                    onClick={handleAddContacts}
                    disabled={selectedManualContacts.length === 0 || isAddingContacts}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-confirm-add-manual"
                  >
                    {isAddingContacts ? "Adding..." : `Add ${selectedManualContacts.length} Selected ${selectedManualContacts.length === 1 ? 'Contact' : 'Contacts'}`}
                  </Button>
                )}

                {addMethod === 'import-csv' && (
                  <Button
                    onClick={handleAddContacts}
                    disabled={parsedContacts.length === 0 || isAddingContacts}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-confirm-import-csv"
                  >
                    {isAddingContacts ? "Importing..." : `Import ${parsedContacts.length} Contact${parsedContacts.length !== 1 ? 's' : ''}`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this contact from the list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteContact}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}