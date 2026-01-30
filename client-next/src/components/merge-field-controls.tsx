import { Plus, Save, Eye, EyeOff } from "lucide-react";

interface MergeFieldControlsProps {
  isMergeViewMode?: boolean;
  onToggleMergeView?: () => void;
  onMergeFieldClick?: () => void;
  onSaveTemplateClick?: () => void;
  className?: string;
}

export function MergeFieldControls({ 
  isMergeViewMode = false,
  onToggleMergeView,
  onMergeFieldClick,
  onSaveTemplateClick,
  className = ""
}: MergeFieldControlsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {onToggleMergeView && (
        <button
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-colors border rounded-md ${
            isMergeViewMode 
              ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100" 
              : "text-muted-foreground hover:text-foreground border-border"
          }`}
          onClick={onToggleMergeView}
          data-testid="button-merge-view"
        >
          {isMergeViewMode ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Normal View</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Merge View</span>
            </>
          )}
        </button>
      )}
      {onMergeFieldClick && (
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
          onClick={onMergeFieldClick}
          data-testid="button-merge-field"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Merge Field</span>
        </button>
      )}
      {onSaveTemplateClick && (
        <button
          onClick={onSaveTemplateClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
          data-testid="button-save-template"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save as Template</span>
        </button>
      )}
    </div>
  );
}