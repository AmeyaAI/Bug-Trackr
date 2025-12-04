import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValidate: () => void;
  onCancel: () => void;
}

export function ValidationDialog({ open, onOpenChange, onValidate, onCancel }: ValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Validation Required</DialogTitle>
          <DialogDescription>
            This item must be validated before it can be moved to Closed.
            Would you like to validate it now?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onValidate}>
            Validate & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
