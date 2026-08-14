'use client';

import * as React from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  className?: string;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  allowClear?: boolean;
  searchable?: boolean;
  maxHeight?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function Select({
  className,
  label,
  error,
  hint,
  placeholder,
  options,
  allowClear = false,
  searchable = false,
  maxHeight = 200,
  id,
  disabled,
  required,
  value,
  onChange,
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const selectRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLButtonElement>(null);

  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchable, searchQuery]);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const handleClickOutside = React.useCallback((event: MouseEvent) => {
    if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
      case 'ArrowUp':
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full" ref={selectRef}>
      {label && (
        <label htmlFor={selectId} className="text-text-label mb-1.5 block text-sm font-medium">
          {label}
          {required && (
            <span className="ml-1 text-error-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative" onKeyDown={handleKeyDown}>
        <button
          type="button"
          ref={inputRef}
          id={selectId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={describedBy}
          aria-disabled={disabled}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-input-bg px-4 py-2.5 text-text-primary',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            searchable && 'pr-12',
            error
              ? 'border-input-border-error focus-visible:ring-error-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950'
              : 'hover:border-input-border-hover border-input-border focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',
            className
          )}
        >
          <span
            className={cn('flex-1 truncate text-left', !selectedOption && 'text-text-tertiary')}
          >
            {selectedOption?.label || placeholder}
          </span>
          {searchable && isOpen && (
            <Search className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          )}
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
              aria-label="Clear selection"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 flex-shrink-0 text-text-tertiary transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              'absolute z-[1500] mt-1.5 max-h-60 w-full animate-scale-in overflow-auto rounded-lg border border-border-light bg-white shadow-lg dark:border-border-dark dark:bg-neutral-900',
              { 'max-h-[200px]': maxHeight }
            )}
            style={{ maxHeight: maxHeight }}
            role="listbox"
            aria-label={label || '选择选项'}
          >
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-border-light bg-white p-2 dark:border-border-dark dark:bg-neutral-900">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-input-border px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
            )}
            <ul className="py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-text-tertiary">
                  {searchable ? '无匹配选项' : '暂无选项'}
                </li>
              ) : (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors',
                      'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      'focus-visible:bg-neutral-100 focus-visible:outline-none dark:focus-visible:bg-neutral-800',
                      option.value === value
                        ? 'bg-primary-50 font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-text-primary',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !option.disabled && handleOptionClick(option.value)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.value === value && (
                      <Check className="h-4 w-4 text-primary-600" aria-hidden="true" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
          {hint}
        </p>
      )}
      <select
        id={`${selectId}-native`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        <option value="">--</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Multi-select variant
interface MultiSelectProps {
  className?: string;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  allowClear?: boolean;
  searchable?: boolean;
  maxHeight?: number;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  value: string[];
  onChange: (values: string[]) => void;
  maxSelected?: number;
}

export function MultiSelect({
  className,
  label,
  error,
  hint,
  placeholder = '请选择...',
  options,
  allowClear = true,
  searchable = true,
  maxHeight = 200,
  id,
  disabled,
  required,
  value = [],
  onChange,
  maxSelected,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const selectRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLButtonElement>(null);

  const selectId = id || `multiselect-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchable, searchQuery]);

  const selectedOptions = React.useMemo(
    () => options.filter((opt) => value.includes(opt.value)),
    [options, value]
  );

  const handleClickOutside = React.useCallback((event: MouseEvent) => {
    if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (event.key === 'Backspace' && value.length > 0 && !searchQuery) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    const newValues = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : maxSelected && value.length >= maxSelected
        ? value
        : [...value, optionValue];
    onChange(newValues);
  };

  const handleRemove = (optionValue: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const handleClearAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange([]);
  };

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-input-label">
          {label}
          {required && (
            <span className="ml-1 text-error-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div ref={selectRef} className="relative" onKeyDown={handleKeyDown}>
        <button
          type="button"
          ref={inputRef}
          id={selectId}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={describedBy}
          aria-disabled={disabled}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-input-bg px-3 py-2 text-text-primary',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-input-border-error focus-visible:ring-error-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950'
              : 'hover:border-input-border-hover border-input-border focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',
            className
          )}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1.5 rounded bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
            >
              {option.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(option.value, e)}
                  className="rounded p-0.5 hover:bg-primary-200/50 dark:hover:bg-primary-800/50"
                  aria-label={`移除 ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {value.length === 0 && <span className="flex-1 text-text-tertiary">{placeholder}</span>}
          {allowClear && value.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
              aria-label="清除所有"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4 flex-shrink-0 text-text-tertiary transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              'absolute z-[1500] mt-1.5 max-h-60 w-full animate-scale-in overflow-auto rounded-lg border border-border-light bg-white shadow-lg dark:border-border-dark dark:bg-neutral-900'
            )}
            style={{ maxHeight: maxHeight }}
            role="listbox"
            aria-label={label || '选择选项'}
          >
            {searchable && (
              <div className="sticky top-0 z-10 border-b border-border-light bg-white p-2 dark:border-border-dark dark:bg-neutral-900">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-lg border border-input-border px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
            )}
            <ul className="py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-text-tertiary">
                  {searchable ? '无匹配选项' : '暂无选项'}
                </li>
              ) : (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={value.includes(option.value)}
                    aria-disabled={option.disabled}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors',
                      'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                      'focus-visible:bg-neutral-100 focus-visible:outline-none dark:focus-visible:bg-neutral-800',
                      value.includes(option.value)
                        ? 'bg-primary-50 font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-text-primary',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !option.disabled && handleOptionClick(option.value)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        value.includes(option.value)
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-transparent'
                      )}
                    />
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <span className="flex-1 truncate">{option.label}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-text-tertiary">
          {hint}
        </p>
      )}
      <select
        id={`${selectId}-native`}
        multiple
        value={value}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
          onChange(selected);
        }}
        disabled={disabled}
        required={required}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
