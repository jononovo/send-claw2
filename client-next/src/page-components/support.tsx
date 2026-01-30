import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Layout } from "@/components/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const supportFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  category: z.string().min(1, "Please select a category"),
  priority: z.string().min(1, "Please select a priority level"),
  description: z.string().min(20, "Please provide more detail about your issue"),
});

type SupportForm = z.infer<typeof supportFormSchema>;

const categories = [
  "Account Access",
  "API Integration",
  "Data Quality",
  "Feature Request",
  "Billing Issues",
  "Technical Problems",
  "Other"
];

const priorities = [
  "Low - General Question",
  "Medium - Minor Issue",
  "High - Service Disruption",
  "Critical - Service Unavailable"
];

const faqs = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password by clicking the 'Forgot Password' link on the login page. Follow the instructions sent to your email to create a new password."
  },
  {
    question: "What are the API rate limits?",
    answer: "API rate limits vary by subscription tier. Starter plans have 100 requests per hour, Professional plans have 500 requests per hour, and Enterprise plans have custom limits."
  },
  {
    question: "How do I upgrade my subscription?",
    answer: "You can upgrade your subscription through the account settings page. Select the new plan you want and follow the payment process. The changes will take effect immediately."
  },
  {
    question: "Is there a limit to data enrichment?",
    answer: "Data enrichment limits are based on your subscription tier. Check your account dashboard or contact our sales team for specific details about your plan's limits."
  }
];

export default function Support() {
  const { toast } = useToast();
  const form = useForm<SupportForm>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      name: "",
      email: "",
      category: "",
      priority: "",
      description: "",
    },
  });

  function onSubmit(data: SupportForm) {
    console.log(data);
    toast({
      title: "Support Ticket Created",
      description: "We'll respond to your inquiry as soon as possible.",
    });
    form.reset();
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Help & Support</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Support Form */}
            <Card>
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select issue category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority level" />
                              </SelectTrigger>
                              <SelectContent>
                                {priorities.map((priority) => (
                                  <SelectItem key={priority} value={priority}>
                                    {priority}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Textarea
                              placeholder="Please describe your issue in detail"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Submit Ticket
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Need More Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our support team is available 24/7 to help you with any questions or issues you may have.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm">
                      Email: support@5ducks.com
                    </p>
                    <p className="text-sm">
                      Phone: +1 (555) 123-4567
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}