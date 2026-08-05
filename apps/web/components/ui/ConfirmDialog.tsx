'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-description"
          className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="text-xl font-bold text-foreground mb-2">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="text-sm text-text-muted mb-6">
              {description}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={onCancel}
                disabled={isBusy}
                className="flex-1 min-h-[44px]"
              >
                {cancelLabel}
              </Button>
              <Button
                variant={variant}
                size="md"
                onClick={onConfirm}
                disabled={isBusy}
                autoFocus
                className={`flex-1 min-h-[44px] ${variant === 'danger' ? '!bg-danger/90 !text-white !border-transparent hover:!bg-danger' : ''}`}
              >
                {isBusy ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
