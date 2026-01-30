'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Users,
  Globe,
  Mail,
  ArrowLeft,
  Star,
  TrendingUp,
  RefreshCw,
  Link2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Company, Contact } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

interface CompanyDetailsClientProps {
  company: Company;
  initialContacts: Contact[];
}

function isMaskedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.includes('***');
}

function hasAnyMaskedEmails(contacts: Contact[]): boolean {
  return contacts.some(c => isMaskedEmail(c.email));
}

export default function CompanyDetailsClient({ company, initialContacts }: CompanyDetailsClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { openModal } = useRegistrationModal();

  // Use initial data from SSR, but allow refetching
  const { data: contacts = initialContacts, refetch: refetchContacts } = useQuery<Contact[]>({
    queryKey: ['/api/companies', company.id, 'contacts'],
    initialData: initialContacts,
  });

  const contactSearchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/companies/${company.id}/enrich-contacts`);
      if (!response.ok) {
        throw new Error('Failed to enrich contacts');
      }
      return response.json();
    },
    onSuccess: async () => {
      await refetchContacts();
      toast({
        title: "Contacts Updated",
        description: "Successfully refreshed company contact information.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  const metrics = [
    {
      name: "Website Ranking",
      value: company.ranking || 0,
      icon: Globe,
    },
    {
      name: "Company Size",
      value: company.size || 0,
      icon: Users,
    },
    {
      name: "LinkedIn Score",
      value: company.linkedinProminence || 0,
      icon: TrendingUp,
    },
    {
      name: "Customer Count",
      value: company.customerCount || 0,
      icon: Building2,
    },
  ];

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/");
    }
  };

  const handleEnrichContacts = () => {
    contactSearchMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={handleBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{company.name}</CardTitle>
                {company.description && (
                  <CardDescription className="mt-2">
                    {company.description}
                  </CardDescription>
                )}
              </div>
              <Badge
                className="text-lg py-2"
                variant={company.totalScore && company.totalScore > 70 ? "default" : "secondary"}
              >
                Score: {company.totalScore ?? 'N/A'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <metric.icon className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">{metric.name}</p>
                    </div>
                    <p className="text-2xl font-bold mt-2">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Signup CTA for masked emails */}
        {!user && hasAnyMaskedEmails(contacts) && (
          <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span>Sign up to see the full email address and run search prompts with AI - 100 credits included.</span>
              <Button 
                size="sm" 
                onClick={() => openModal()}
                className="ml-4 shrink-0"
                data-testid="button-signup-cta"
              >
                Sign Up Free
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Key Contacts
              </CardTitle>
              {user && (
                <Button
                  variant="outline"
                  onClick={handleEnrichContacts}
                  disabled={contactSearchMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${contactSearchMutation.isPending ? 'animate-spin' : ''}`} />
                  Enrich Contacts
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.role}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {contact.probability || 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {((company.services?.length ?? 0) > 0 || (company.validationPoints?.length ?? 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-8">
            {company.services && company.services.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Services Offered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {company.services.map((service, index) => (
                      <Badge key={index} variant="secondary">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {company.validationPoints && company.validationPoints.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Validation Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {company.validationPoints.map((point, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-5 w-5" />
                <span>Company Website:</span>
                {company.website ? (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  <span className="italic">No website available</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="h-5 w-5" />
                <span>Company Profile:</span>
                {company.alternativeProfileUrl ? (
                  <a
                    href={company.alternativeProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {company.alternativeProfileUrl}
                  </a>
                ) : (
                  <span className="italic">No profile link available</span>
                )}
              </div>
              {company.age && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-5 w-5" />
                  <span>Company Age:</span>
                  <span>{company.age} years</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
