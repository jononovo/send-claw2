import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import QuickTemplates from '../quick-templates';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import type { EmailTemplate } from '@shared/schema';
import type { TemplateManagerProps } from './types';

export function TemplateManager({
  templates,
  templatesLoading,
  onTemplateSelect,
  currentContent,
  currentSubject,
  emailPrompt,
  isEditMode: isEditModeProp,
  isMergeViewMode,
  onEditModeChange,
  onMergeViewToggle,
  onMergeFieldInsert,
  selectedContact,
  selectedCompany,
  user,
  editingTemplateId: editingTemplateIdProp,
  editingTemplate: editingTemplateProp,
}: TemplateManagerProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isEditModeProp || false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(editingTemplateIdProp || null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(editingTemplateProp || null);

  // Update mutation for templates
  const updateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const res = await apiRequest("PUT", `/api/email-templates/${template.id}`, template);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template updated successfully!" });
    }
  });

  const handleSaveTemplate = async (templateName: string) => {
    try {
      await apiRequest("POST", '/api/email-templates', {
        name: templateName,
        subject: currentSubject,
        content: currentContent,
        description: emailPrompt
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template saved successfully!" });
    } catch (error) {
      console.error('Save template error:', error);
      toast({
        title: "Failed to save template",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !editingTemplate) return;
    
    updateMutation.mutate({
      ...editingTemplate,
      subject: currentSubject,
      content: currentContent,
      description: emailPrompt
    } as EmailTemplate);
  };

  const enterEditMode = (template: any) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setEditingTemplate(template);
    onEditModeChange?.(true);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
    setEditingTemplate(null);
    onEditModeChange?.(false);
  };

  const handleMergeFieldInsert = (field: string) => {
    onMergeFieldInsert(field);
  };

  return (
    <QuickTemplates
      templates={templates}
      templatesLoading={templatesLoading}
      onSelectTemplate={onTemplateSelect}
      onSaveTemplate={handleSaveTemplate}
      onUpdateTemplate={handleUpdateTemplate}
      onMergeFieldInsert={handleMergeFieldInsert}
      onEditTemplate={enterEditMode}
      isEditMode={isEditMode}
      editingTemplateId={editingTemplateId}
      onExitEditMode={exitEditMode}
      isMergeViewMode={isMergeViewMode}
      onToggleMergeView={onMergeViewToggle}
      isSavingTemplate={updateMutation.isPending}
    />
  );
}