import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserSearch, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const individualSearchSchema = z.object({
  fullName: z.string().min(2, "Full name is required (at least 2 characters)"),
  location: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  otherContext: z.string().optional(),
  knownEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

export type IndividualSearchFormData = z.infer<typeof individualSearchSchema>;

interface IndividualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (data: IndividualSearchFormData) => void;
  isSearching?: boolean;
}

export function IndividualSearchModal({
  isOpen,
  onClose,
  onSearch,
  isSearching = false,
}: IndividualSearchModalProps) {
  const form = useForm<IndividualSearchFormData>({
    resolver: zodResolver(individualSearchSchema),
    defaultValues: {
      fullName: "",
      location: "",
      role: "",
      company: "",
      otherContext: "",
      knownEmail: "",
    },
  });

  const handleSubmit = (data: IndividualSearchFormData) => {
    onSearch(data);
  };

  const handleClose = () => {
    if (!isSearching) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserSearch className="h-5 w-5 text-blue-600" />
            Find Individual
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Full Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jonathan Novotny"
                      data-testid="input-full-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">
                    Location (city, state, or country)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New York, USA"
                      data-testid="input-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">Role or Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VP of Engineering"
                      data-testid="input-role"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">Company</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Corp"
                      data-testid="input-company"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otherContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">Other Context</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Previously worked at Google"
                      data-testid="input-other-context"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="knownEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600">
                    Known Email (helps verify identity)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jnovotny@oldcompany.com"
                      data-testid="input-known-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSearching}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSearching}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                data-testid="button-search"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default IndividualSearchModal;
