import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Edit, Save } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmailTemplate } from "@shared/schema";
import MergeFieldDialog from "./merge-field-dialog";
import { MergeFieldControls } from "./merge-field-controls";

interface QuickTemplatesProps {
  templates: EmailTemplate[];
  templatesLoading: boolean;
  onSelectTemplate: (template: EmailTemplate) => void;
  onSaveTemplate?: (templateName: string) => void;
  onUpdateTemplate?: () => void;
  onMergeFieldInsert?: (mergeField: string) => void;
  onEditTemplate?: (template: EmailTemplate) => void;
  isEditMode?: boolean;
  editingTemplateId?: number | null;
  onExitEditMode?: () => void;
  isMergeViewMode?: boolean;
  onToggleMergeView?: () => void;
  isSavingTemplate?: boolean;
}

export default function QuickTemplates({ templates, templatesLoading, onSelectTemplate, onSaveTemplate, onUpdateTemplate, onMergeFieldInsert, onEditTemplate, isEditMode, editingTemplateId, onExitEditMode, isMergeViewMode, onToggleMergeView, isSavingTemplate = false }: QuickTemplatesProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [mergeFieldDialogOpen, setMergeFieldDialogOpen] = useState(false);
  const [editConfirmDialogOpen, setEditConfirmDialogOpen] = useState(false);
  const [insertConfirmDialogOpen, setInsertConfirmDialogOpen] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const queryClient = useQueryClient();

  // Now templates and loading state come from props
  const typedTemplates = templates;

  const handleInsertTemplate = () => {
    if (!selectedTemplateId) {
      return;
    }
    setInsertConfirmDialogOpen(true);
  };

  const handleConfirmInsert = () => {
    const template = typedTemplates.find(t => t.id.toString() === selectedTemplateId);
    if (template) {
      console.log('QuickTemplates - Selected template:', { id: template.id, name: template.name });
      onSelectTemplate(template);
    }
    setInsertConfirmDialogOpen(false);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplateId) {
      return;
    }
    setEditConfirmDialogOpen(true);
  };

  const handleConfirmEdit = () => {
    const template = typedTemplates.find(t => t.id.toString() === selectedTemplateId);
    if (template && onEditTemplate) {
      console.log('QuickTemplates - Loading template for editing:', { id: template.id, name: template.name });
      onEditTemplate(template);
    }
    setEditConfirmDialogOpen(false);
  };

  const handleSaveTemplate = () => {
    if (!onSaveTemplate) return;
    setTemplateName("");
    setSaveTemplateDialogOpen(true);
  };

  const handleConfirmSave = () => {
    if (!templateName.trim() || !onSaveTemplate) return;
    onSaveTemplate(templateName.trim());
    setSaveTemplateDialogOpen(false);
    setTemplateName("");
  };



  return (
    <div className="space-y-4 pt-6">
      {/* Edit Mode Notification Banner */}
      {isEditMode && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md text-sm mb-4">
          Edit Template Mode
        </div>
      )}
      
      {/* Merge View Mode Notification Banner */}
      {isMergeViewMode && !isEditMode && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md text-sm mb-4">
          Merge View Mode - Showing technical merge fields
        </div>
      )}
      
      <div className="flex items-center justify-end gap-1.5 mb-4">
        <MergeFieldControls 
          isMergeViewMode={isMergeViewMode}
          onToggleMergeView={onToggleMergeView}
          onMergeFieldClick={() => setMergeFieldDialogOpen(true)}
          onSaveTemplateClick={onSaveTemplate ? handleSaveTemplate : undefined}
        />
      </div>

      <div className="space-y-2">
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger className="h-7 text-xs text-muted-foreground">
            <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select a Template"} />
          </SelectTrigger>
          <SelectContent>
            {typedTemplates.map((template) => (
              <SelectItem 
                key={template.id} 
                value={template.id.toString()}
                className="pl-3 text-xs"
              >
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end gap-1.5">
          <Button 
            variant="secondary"
            onClick={handleInsertTemplate} 
            disabled={!selectedTemplateId}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground mr-1 hover:scale-105 transition-all duration-300 ease-out"
          >
            <FileText className="w-3 h-3 mr-0.5" />
            Insert Template
          </Button>
          <Button 
            variant="secondary"
            onClick={isEditMode ? () => onUpdateTemplate?.() : handleEditTemplate} 
            disabled={!selectedTemplateId || isSavingTemplate}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground mr-1 hover:scale-105 transition-all duration-300 ease-out"
          >
            {isEditMode ? (
              isSavingTemplate ? (
                <>
                  <Save className="w-3 h-3 mr-0.5 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 mr-0.5" />
                  Save Template
                </>
              )
            ) : (
              <>
                <Edit className="w-3 h-3 mr-0.5" />
                Edit Template
              </>
            )}
          </Button>
        </div>
      </div>
      
      <MergeFieldDialog 
        open={mergeFieldDialogOpen} 
        onOpenChange={setMergeFieldDialogOpen}
        onMergeFieldInsert={onMergeFieldInsert}
      />

      <AlertDialog open={editConfirmDialogOpen} onOpenChange={setEditConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Template</AlertDialogTitle>
            <AlertDialogDescription>
              Editing this template, will replace all content currently in fields on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditConfirmDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>
              Load the Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={insertConfirmDialogOpen} onOpenChange={setInsertConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Template</AlertDialogTitle>
            <AlertDialogDescription>
              Loading this template, will replace all content currently in fields on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInsertConfirmDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInsert}>
              Load the Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Enter name of new template:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sales Genius 2027"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && templateName.trim()) {
                  handleConfirmSave();
                }
              }}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSaveTemplateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSave}
              disabled={!templateName.trim()}
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}