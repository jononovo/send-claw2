import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserX,
  Ban,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Trash2,
  Mail,
  Target,
  Calendar,
  Download,
  Info,
} from "lucide-react";
import type { ContactList, Contact, InsertContactList } from "@shared/schema";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ContactStats {
  totalContacts: number;
  unsubscribers: number;
  blocklist: number;
}

// Form validation schema
const listFormSchema = z.object({
  name: z.string().min(1, "List name is required"),
  description: z.string().optional(),
  noDuplicatesWithOtherLists: z.boolean().default(false),
});

type ListFormValues = z.infer<typeof listFormSchema>;

// ContactListModal component - unified for create and edit modes
function ContactListModal({ 
  open, 
  onOpenChange,
  list
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  list?: ContactList | null;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!list;

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: {
      name: "",
      description: "",
      noDuplicatesWithOtherLists: false,
    },
  });

  // Reset form when modal opens/closes or list changes
  useEffect(() => {
    if (open && list) {
      form.reset({
        name: list.name,
        description: list.description || "",
        noDuplicatesWithOtherLists: list.noDuplicatesWithOtherLists ?? false,
      });
    } else if (open && !list) {
      form.reset({
        name: "",
        description: "",
        noDuplicatesWithOtherLists: false,
      });
    }
  }, [open, list, form]);

  const createListMutation = useMutation({
    mutationFn: async (values: ListFormValues) => {
      const response = await apiRequest("POST", "/api/contact-lists", {
        ...values,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact list created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contact list",
        variant: "destructive",
      });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: async (values: ListFormValues) => {
      const response = await apiRequest("PUT", `/api/contact-lists/${list!.id}`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact list updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ListFormValues) => {
    if (isEditMode) {
      updateListMutation.mutate(values);
    } else {
      createListMutation.mutate(values);
    }
  };

  const isPending = createListMutation.isPending || updateListMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Contact List" : "Create New Contact List"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update your contact list settings" : "Create a new list to organize your contacts"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q1 2025 Prospects"
                      {...field}
                      data-testid="input-list-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add a description..."
                      {...field}
                      data-testid="input-list-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noDuplicatesWithOtherLists"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        No duplicates with other lists
                      </FormLabel>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px]">
                            <p>When enabled, contacts will be filtered out if their email already exists in any of your other contact lists.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-no-duplicates"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isPending}
                data-testid={isEditMode ? "button-update-list" : "button-create-list"}
              >
                {isPending 
                  ? (isEditMode ? "Updating..." : "Creating...") 
                  : (isEditMode ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Contacts() {
  const [listModalOpen, setListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ContactList | null>(null);
  const [selectedLists, setSelectedLists] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch contact lists
  const { data: contactLists = [], isLoading: listsLoading, refetch: refetchLists } = useQuery<ContactList[]>({
    queryKey: ["/api/contact-lists"],
    enabled: !!user,
  });

  // Fetch all contacts to calculate stats
  const { data: contactsData, isLoading: contactsLoading } = useQuery<{ total: number; contacts: Contact[] }>({
    queryKey: ["/api/contacts"],
    enabled: !!user,
  });

  // Calculate contact statistics
  const contactStats: ContactStats = {
    totalContacts: contactsData?.total || 0,
    // For now, we'll set unsubscribers and blocklist to 0 or mock values
    // These would typically come from a specific field in the contact data
    unsubscribers: 13, // Mock value matching the design
    blocklist: 0, // Mock value matching the design
  };

  // Use pagination hook for contact lists
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedLists,
    handlePreviousPage,
    handleNextPage,
  } = usePagination(contactLists, { itemsPerPage: 10 });

  const handleNewList = () => {
    setEditingList(null);
    setListModalOpen(true);
  };

  const handleEditList = (list: ContactList) => {
    setEditingList(list);
    setListModalOpen(true);
  };

  const handleCloseListModal = (open: boolean) => {
    setListModalOpen(open);
    if (!open) {
      setEditingList(null);
    }
  };

  const handleListClick = (listId: number) => {
    router.push(`/contact-lists/${listId}`);
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedLists(new Set(paginatedLists.map(list => list.id)));
    } else {
      setSelectedLists(new Set());
    }
  };

  // Toggle list selection
  const toggleListSelection = (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();
    setSelectedLists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  };

  // Update select all status when selections change
  useEffect(() => {
    const allSelected = paginatedLists.length > 0 && paginatedLists.every(list => selectedLists.has(list.id));
    setSelectAll(allSelected);
  }, [selectedLists, paginatedLists]);

  // Delete list mutation
  const deleteListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const response = await apiRequest("DELETE", `/api/contact-lists/${listId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contact list deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-lists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact list",
        variant: "destructive",
      });
    },
  });

  const handleDeleteList = (e: React.MouseEvent, listId: number, listName: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${listName}"? This action cannot be undone.`)) {
      deleteListMutation.mutate(listId);
    }
  };

  // Download CSV function
  const handleDownloadCSV = async (e: React.MouseEvent, listId: number, listName: string) => {
    e.stopPropagation();
    
    try {
      // Fetch contacts for the list
      const response = await apiRequest("GET", `/api/contact-lists/${listId}/contacts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const contacts = await response.json();
      
      if (!contacts || contacts.length === 0) {
        toast({
          title: "No contacts",
          description: "This list has no contacts to download",
        });
        return;
      }
      
      // Create CSV content with new format (email first)
      const headers = ['email', 'first_name', 'last_name', 'company', 'role', 'city'];
      const csvContent = [
        headers.join(','),
        ...contacts.map((contact: any) => {
          // Parse the full name into first and last name
          const nameParts = (contact.name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Safely handle company name which might be an object or string
          const companyName = typeof contact.company === 'object' 
            ? contact.company?.name || '' 
            : contact.company || '';
          
          const row = [
            contact.email || '',
            firstName,
            lastName,
            companyName,
            contact.role || '',
            contact.location || contact.city || ''
          ];
          
          // Escape values that contain commas or quotes
          return row.map(value => {
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');
        })
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${listName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contacts.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `Downloaded ${contacts.length} contacts as CSV`,
      });
      
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: "Error",
        description: "Failed to download contacts as CSV",
        variant: "destructive",
      });
    }
  };

  const isLoading = listsLoading || contactsLoading;

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <Button
            onClick={handleNewList}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-new-list"
          >
            <Plus className="w-4 h-4 mr-2" />
            New list
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* All contacts card - clickable */}
          <Link href="/contacts/all-contacts">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        All contacts
                      </p>
                      <p className="text-2xl font-bold mt-1" data-testid="text-all-contacts-count">
                        {contactStats.totalContacts.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Unsubscribers card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <UserX className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Unsubscribers
                    </p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-unsubscribers-count">
                      {contactStats.unsubscribers}
                    </p>
                  </div>
                </div>
                <UserX className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Blocklist card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <Ban className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Blocklist
                    </p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-blocklist-count">
                      {contactStats.blocklist}
                    </p>
                  </div>
                </div>
                <Ban className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your lists section with gradient background */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <h2 className="text-xl font-semibold">Your lists</h2>
            <CardDescription>
              Organize your contacts into lists for targeted campaigns
            </CardDescription>
          </CardHeader>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-muted-foreground">Loading lists...</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-hidden relative">
                {/* Fluffy gradient background matching company table */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(219,234,254,0.6),rgba(239,246,255,0.4),rgba(224,242,254,0.3))] dark:bg-[radial-gradient(ellipse_at_bottom_right,rgba(30,58,138,0.2),rgba(37,99,235,0.15),rgba(29,78,216,0.1))] pointer-events-none"></div>
                <div className="relative z-10">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-8">
                          <Checkbox 
                            checked={selectAll}
                            onCheckedChange={(checked) => handleSelectAll(checked === true)}
                            aria-label="Select all lists"
                          />
                        </TableHead>
                        <TableHead className="font-medium">List Name</TableHead>
                        <TableHead className="hidden md:table-cell font-medium">Contacts</TableHead>
                        <TableHead className="hidden md:table-cell font-medium">Campaigns</TableHead>
                        <TableHead className="font-medium">Created</TableHead>
                        <TableHead className="text-right font-medium">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLists.length > 0 ? (
                        paginatedLists.map((list) => (
                          <TableRow
                            key={list.id}
                            className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:opacity-100 bg-transparent transition-all duration-200"
                            onClick={() => handleListClick(list.id)}
                            data-testid={`row-list-${list.id}`}
                          >
                            <TableCell 
                              className="px-2 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox 
                                checked={selectedLists.has(list.id)}
                                onCheckedChange={() => toggleListSelection({stopPropagation: () => {}} as React.MouseEvent, list.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${list.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium py-3">
                              <div className="flex flex-col">
                                <div className="font-semibold flex items-center gap-1.5">
                                  {list.isDefault && <Target className="h-4 w-4 text-primary" />}
                                  {list.name}
                                </div>
                                {list.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {list.description}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                              <Badge variant="secondary" className="font-normal">
                                <Users className="h-3 w-3 mr-1" />
                                {list.contactCount || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-3">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="font-normal">
                                      <Target className="h-3 w-3 mr-1" />
                                      0 active
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>No active campaigns for this list</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="text-sm text-muted-foreground">
                                {list.createdAt
                                  ? format(new Date(list.createdAt), "MMM d, yyyy 'at' h:mm a")
                                  : "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditList(list);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "Campaign creation will be available soon",
                                      });
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Create Campaign
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "List duplication will be available soon",
                                      });
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => handleDownloadCSV(e, list.id, list.name)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download CSV
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({
                                        title: "Coming Soon",
                                        description: "List archiving will be available soon",
                                      });
                                    }}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                  {!list.isDefault && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={(e) => handleDeleteList(e, list.id, list.name)}
                                        data-testid={`button-delete-list-${list.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="text-muted-foreground">
                              <p>No lists yet</p>
                              <p className="text-sm mt-1">
                                Click "New list" to create your first contact list
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Viewing {startIndex + 1}—
                    {Math.min(endIndex, contactLists.length)} over{" "}
                    {contactLists.length} results
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
            </>
          )}
        </Card>
      </div>

      {/* Contact List Modal - Create/Edit */}
      <ContactListModal 
        open={listModalOpen} 
        onOpenChange={handleCloseListModal}
        list={editingList}
      />
    </>
  );
}