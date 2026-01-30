import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatService, emailTemplatesService } from '../services';
import { useToast } from '@/hooks/use-toast';
import type { GenerateEmailContentRequest } from '../types';

/**
 * Custom hook for managing email generation and templates
 */
export function useEmailGeneration() {
  const { toast } = useToast();
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Mutation for generating email content
  const generateContentMutation = useMutation({
    mutationFn: chatService.generateEmailContent,
    onSuccess: (response) => {
      if (response.emailContent) {
        setGeneratedContent(response.emailContent);
        toast({
          title: "Success",
          description: "Email content generated successfully"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate email content",
        variant: "destructive"
      });
    }
  });

  // Mutation for saving email template
  const saveTemplateMutation = useMutation({
    mutationFn: emailTemplatesService.createTemplate,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email template saved successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive"
      });
    }
  });

  const generateEmail = useCallback(async (data: GenerateEmailContentRequest) => {
    setIsGenerating(true);
    try {
      const result = await generateContentMutation.mutateAsync(data);
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, [generateContentMutation]);

  const saveAsTemplate = useCallback(async (
    name: string,
    subject: string,
    body: string,
    tone?: string,
    offer?: string
  ) => {
    return saveTemplateMutation.mutateAsync({
      name,
      subject,
      body,
      tone,
      offer
    });
  }, [saveTemplateMutation]);

  const clearGeneratedContent = useCallback(() => {
    setGeneratedContent('');
  }, []);

  return {
    generatedContent,
    isGenerating,
    generateEmail,
    saveAsTemplate,
    clearGeneratedContent,
    isSavingTemplate: saveTemplateMutation.isPending
  };
}