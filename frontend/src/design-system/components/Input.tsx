import * as React from 'react';
import { cn } from '../utils/cn';
import { Box } from './Box';
import { IconButton } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      rightElement,
      fullWidth = true,
      className,
      id,
      disabled,
      required,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <Box as="div" className={cn('w-full', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn('block text-xs sm:text-sm font-medium text-text-primary mb-1', required && 'after:content-["*"] after:text-nj-critical after:ml-0.5')}
          >
            {label}
          </label>
        )}
        <Box as="div" className="relative">
          {leftIcon && (
            <Box
              as="div"
              className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-tertiary"
              aria-hidden="true"
            >
              {leftIcon}
            </Box>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input w-full',
              leftIcon && 'pl-10',
              (rightIcon || rightElement) && 'pr-10',
              error && 'input-error',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
          />
          {(rightIcon || rightElement) && (
            <Box
              as="div"
              className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary"
              aria-hidden="true"
            >
              {rightElement || rightIcon}
            </Box>
          )}
        </Box>
        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs sm:text-sm text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs sm:text-sm text-nj-critical flex items-center gap-1" role="alert">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm0-14a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 2zm0 11.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
            </svg>
            {error}
          </p>
        )}
      </Box>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
  minRows?: number;
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      fullWidth = true,
      className,
      id,
      disabled,
      required,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [hintId, errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <Box as="div" className={cn('w-full', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn('block text-sm font-medium text-text-primary mb-1.5', required && 'after:content-["*"] after:text-nj-critical after:ml-0.5')}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('input w-full resize-y', error && 'input-error', className)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-required={required}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-nj-critical flex items-center gap-1" role="alert">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm0-14a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 2zm0 11.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
            </svg>
            {error}
          </p>
        )}
      </Box>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      placeholder,
      fullWidth = true,
      className,
      id,
      disabled,
      required,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [hintId, errorId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

    return (
      <Box as="div" className={cn('w-full', fullWidth && 'w-full', className)}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn('block text-sm font-medium text-text-primary mb-1', required && 'after:content-["*"] after:text-nj-critical after:ml-0.5')}
          >
            {label}
          </label>
        )}
        <Box as="div" className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn('input w-full appearance-none pr-10', error && 'input-error', className)}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <Box
            as="div"
            className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-text-tertiary"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 5.646a.5.5 0 01.708 0L8 8.293l2.646-2.647a.5.5 0 01.708.708l-3 3a.5.5 0 01-.708 0l-3-3a.5.5 0 010-.708z" />
            </svg>
          </Box>
        </Box>
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-nj-critical flex items-center gap-1" role="alert">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm0-14a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 018 2zm0 11.25a.75.75 0 100-1.5.75.75 0 000 1.5z" />
            </svg>
            {error}
          </p>
        )}
      </Box>
    );
  }
);

Select.displayName = 'Select';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onSearch?: (value: string) => void;
  debounceMs?: number;
  clearable?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      onSearch,
      debounceMs = 250,
      clearable = true,
      value,
      onChange,
      className,
      style,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onSearch?.(value == null ? '' : String(value));
      }, debounceMs);
      return () => clearTimeout(timer);
    }, [value, debounceMs, onSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
    };

    const handleClear = () => {
      onChange?.({ target: { value: '' } } as any);
      onSearch?.('');
    };

    return (
      <Box as="div" className={cn('relative', className)} style={style}>
        <svg
          className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-tertiary w-5 h-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={ref}
          type="search"
          className={cn('input pl-10 pr-10', className)}
          value={value}
          onChange={handleChange}
          {...props}
        />
        {clearable && value && (
          <IconButton
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-2"
            onClick={handleClear}
            size="sm"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 010-.708z" />
              </svg>
            }
          />
        )}
      </Box>
    );
  }
);

SearchInput.displayName = 'SearchInput';