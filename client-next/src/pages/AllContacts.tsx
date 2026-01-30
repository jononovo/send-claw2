import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Building, Briefcase, Search, Users, ChevronLeft, ChevronRight, Filter, MapPin, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Contact, ContactList } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

export default function AllContacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const contactsPerPage = 50; // Show 50 contacts per page
  const { user } = useAuth();
  
  // Fetch all contacts
  const { data: contactsData, isLoading } = useQuery<{ total: number; contacts: Contact[] }>({
    queryKey: ['/api/contacts'],
    enabled: !!user,
  });

  // Fetch contact lists for filter dropdown
  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
    enabled: !!user,
  });

  // Fetch contacts from selected list if a list is selected
  const { data: listMembers = [] } = useQuery<Contact[]>({
    queryKey: [`/api/contact-lists/${selectedListId}/contacts`],
    enabled: !!user && selectedListId !== 'all',
  });

  const contacts = contactsData?.contacts || [];

  // Apply all filters
  const filteredContacts = contacts.filter(contact => {
    // Apply search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      contact.name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.role?.toLowerCase().includes(search) ||
      contact.location?.toLowerCase().includes(search)
    );

    // Apply email filter
    const matchesEmailFilter = !hasEmailFilter || !!contact.email;

    // Apply location filter
    const matchesLocationFilter = !locationFilter || 
      contact.location?.toLowerCase().includes(locationFilter.toLowerCase());

    // Apply contact list filter
    const matchesListFilter = selectedListId === 'all' || 
      listMembers.some(member => member.id === contact.id);

    return matchesSearch && matchesEmailFilter && matchesLocationFilter && matchesListFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
  const startIndex = (currentPage - 1) * contactsPerPage;
  const endIndex = startIndex + contactsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with back button */}
      <div className="mb-6">
        <Link href="/contacts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contact Lists
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">All Contacts</h1>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          {/* Search bar with filter toggle */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
              data-testid="toggle-filters"
            >
              <Filter className={`h-4 w-4 ${showFilters ? 'text-blue-600' : 'text-gray-500'}`} />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, role, or location..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="search-contacts"
              />
            </div>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t">
              {/* Has Email Filter */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="has-email"
                  checked={hasEmailFilter}
                  onCheckedChange={(checked) => {
                    setHasEmailFilter(checked as boolean);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                />
                <label
                  htmlFor="has-email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has email address
                </label>
              </div>

              {/* Location Filter */}
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <MapPin className="h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Filter by city..."
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                  className="flex-1 h-9"
                  data-testid="filter-location"
                />
              </div>

              {/* Contact List Filter */}
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <List className="h-4 w-4 text-gray-500" />
                <Select 
                  value={selectedListId} 
                  onValueChange={(value) => {
                    setSelectedListId(value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All contacts</SelectItem>
                    {contactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name} ({list.contactCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(hasEmailFilter || selectedListId !== 'all' || locationFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHasEmailFilter(false);
                    setSelectedListId('all');
                    setLocationFilter('');
                    setCurrentPage(1);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>
              {searchTerm ? `${filteredContacts.length} contacts found` : `All Contacts (${contacts.length})`}
            </span>
            {filteredContacts.length > contactsPerPage && (
              <span className="text-sm text-gray-500 font-normal">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredContacts.length)} of {filteredContacts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No contacts match your search.' : 'No contacts found.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContacts.map((contact) => (
                  <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                    <TableCell className="font-medium">
                      {contact.name || '-'}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contact as any).companyName ? (
                        <span>{(contact as any).companyName}</span>
                      ) : contact.companyId ? (
                        <span>Company {contact.companyId}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.role || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {contact.location || <span className="text-gray-400">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {filteredContacts.length > contactsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {/* Page numbers - show max 5 pages */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      // Adjust page numbers to show around current page
                      if (totalPages > 5) {
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}