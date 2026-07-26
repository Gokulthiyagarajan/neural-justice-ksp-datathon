import * as React from 'react';
import { useTranslation } from 'react-i18next';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../utils/cn';
import { Box } from './Box';
import { Button } from './Button';
import { IconButton } from './Button';
import { Flex } from './Box';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeStyles = {
  sm: 'max-w-[calc(100vw-2rem)] sm:max-w-sm',
  md: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
  lg: 'max-w-[calc(100vw-2rem)] sm:max-w-lg',
  xl: 'max-w-[calc(100vw-2rem)] sm:max-w-xl',
  full: 'max-w-[90vw] w-[calc(100vw-2rem)]',
};

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onOpenChange,
      title,
      description,
      children,
      size = 'md',
      showClose = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
            'data-[state=closed]:animate-fade-out'
          )}
          onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}
        />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 bg-bg-card border border-border-primary rounded-[16px] shadow-xl',
            'data-[state=open]:animate-fade-in-scale',
            'data-[state=closed]:animate-fade-out-scale',
            'max-h-[85vh] flex flex-col',
            sizeStyles[size],
            className
          )}
          style={style}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => closeOnEscape && (onOpenChange(false), e.preventDefault())}
          {...props}
        >
          {(title || showClose) && (
            <Flex
              as="div"
              className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 md:p-4 border-b border-border-primary"
            >
              <div className="min-w-0">
                {title && (
                  <DialogPrimitive.Title className="text-sm sm:text-base font-semibold text-text-primary truncate">
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description className="text-xs sm:text-sm text-text-tertiary mt-0.5 sm:mt-1">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {showClose && (
                <IconButton
                  type="button"
                  aria-label={t('common.close')}
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  size="icon"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  }
                />
              )}
            </Flex>
          )}
          <Box as="div" className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-4">
            {children}
          </Box>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
    );
  }
);

Modal.displayName = 'Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} size="sm">
      <Flex as="div" className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={handleConfirm} loading={loading}>
          {confirmText}
        </Button>
      </Flex>
    </Modal>
  );
}

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
}: AlertDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}