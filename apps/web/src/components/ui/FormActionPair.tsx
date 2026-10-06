import React from 'react';
import { Button } from './Button';
import { Check, X } from 'lucide-react';

export interface FormActionPairProps {
  saveLabel?: string;
  cancelLabel?: string;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  saveType?: 'button' | 'submit';
}

/**
 * Standard Pharma Form Action Pair:
 * Save (green #15803D) and Cancel (red #DC2626) as a full-width pair at the bottom of forms.
 */
export const FormActionPair: React.FC<FormActionPairProps> = ({
  saveLabel = 'Save Record',
  cancelLabel = 'Cancel',
  onSave,
  onCancel,
  isSaving = false,
  disabled = false,
  saveType = 'submit',
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 w-full pt-4 mt-2 border-t border-pharma-muted/20">
      <Button
        type={saveType}
        variant="save"
        size="md"
        fullWidth
        isLoading={isSaving}
        disabled={disabled || isSaving}
        onClick={saveType === 'button' ? onSave : undefined}
      >
        <Check className="w-4 h-4 mr-1.5" />
        {saveLabel}
      </Button>

      <Button
        type="button"
        variant="cancel"
        size="md"
        fullWidth
        disabled={isSaving}
        onClick={onCancel}
      >
        <X className="w-4 h-4 mr-1.5" />
        {cancelLabel}
      </Button>
    </div>
  );
};
