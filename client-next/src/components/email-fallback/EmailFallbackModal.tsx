import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Copy, ExternalLink, CheckCircle2, Globe } from 'lucide-react';
import { EmailOptions } from '@/services/email-fallback/email-link-generator';
import { useToast } from '@/hooks/use-toast';

interface EmailFallbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailOptions: EmailOptions;
  onSelectMethod: (method: 'mailto' | 'gmail' | 'outlook' | 'yahoo' | 'copy') => void;
}

export function EmailFallbackModal({
  open,
  onOpenChange,
  emailOptions,
  onSelectMethod
}: EmailFallbackModalProps) {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      
      toast({
        title: "Copied!",
        description: `${section} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please select and copy the text manually",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose How to Send Email</DialogTitle>
          <DialogDescription>
            Select your preferred method to send this email
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="webmail" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="webmail">Web Email</TabsTrigger>
            <TabsTrigger value="client">Email App</TabsTrigger>
            <TabsTrigger value="manual">Copy Details</TabsTrigger>
          </TabsList>

          <TabsContent value="webmail" className="space-y-4">
            <div className="grid gap-3">
              <Card 
                className="cursor-pointer hover:bg-accent-hover transition-colors"
                onClick={() => onSelectMethod('gmail')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Mail className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Gmail</CardTitle>
                        <CardDescription className="text-xs">
                          Open in Gmail web interface
                        </CardDescription>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-accent-hover transition-colors"
                onClick={() => onSelectMethod('outlook')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Outlook</CardTitle>
                        <CardDescription className="text-xs">
                          Open in Outlook.com
                        </CardDescription>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-accent-hover transition-colors"
                onClick={() => onSelectMethod('yahoo')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Globe className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Yahoo Mail</CardTitle>
                        <CardDescription className="text-xs">
                          Open in Yahoo Mail
                        </CardDescription>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="client" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Default Email Application</CardTitle>
                <CardDescription>
                  Opens your computer's default email program (Outlook, Apple Mail, Thunderbird, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => onSelectMethod('mailto')}
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Open Email Application
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Note: This requires an email application to be installed and configured on your device.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Details</CardTitle>
                <CardDescription>
                  Copy these details to paste into any email service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">To:</label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs">
                      {emailOptions.to}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(emailOptions.to, 'Recipient')}
                    >
                      {copiedSection === 'Recipient' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {emailOptions.subject && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject:</label>
                    <div className="flex gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs">
                        {emailOptions.subject}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(emailOptions.subject!, 'Subject')}
                      >
                        {copiedSection === 'Subject' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {emailOptions.body && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message:</label>
                    <div className="flex gap-2">
                      <pre className="flex-1 p-3 bg-muted rounded text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {emailOptions.body}
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(emailOptions.body!, 'Message')}
                      >
                        {copiedSection === 'Message' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => onSelectMethod('copy')}
                  className="w-full mt-4"
                  variant="secondary"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy All Details
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}