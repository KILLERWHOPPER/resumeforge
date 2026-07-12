"use client";

import * as React from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: SelectOption[];
  allowClear?: boolean;
  searchable?: boolean;
  maxHeight?: number;
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
  onBlur,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const selectRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const optionRefs = React.useRef<Map<string, HTMLLIElement>>(new Map());

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

  const handleClickOutside = React.useCallback(
    (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    },
    []
  );

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
      case "ArrowUp":
        event.preventDefault();
        break;
      case "Enter":
      case " ":
        if (!isOpen) {
          event.preventDefault();
          setIsOpen(true);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    onChange?.({ target: { value: optionValue } } as React.ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange?.({ target: { value: "" } } as React.ChangeEvent<HTMLSelectElement>);
    setSearchQuery("");
  };

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-input-label mb-1.5"
        >
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <div
        ref={selectRef}
        className="relative"
        onKeyDown={handleKeyDown}
      >
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
          onBlur={onBlur}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 rounded-lg border bg-input-bg text-text-primary",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            searchable && "pr-12",
            error
              ? "border-input-border-error focus-visible:ring-error-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              : "border-input-border hover:border-input-border-hover focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
            className
          )}
        >
          <span className={cn("flex-1 text-left truncate", !selectedOption && "text-text-tertiary")}>
            {selectedOption?.label || placeholder}
          </span>
          {searchable && isOpen && (
            <Search className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          )}
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="清除选择"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-tertiary transition-transform duration-150 flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-[1500] w-full mt-1.5 max-h-60 overflow-auto rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-neutral-900 shadow-lg animate-scale-in",
              { "max-h-[200px]": maxHeight }
            )}
            style={{ maxHeight: maxHeight }}
            role="listbox"
            aria-label={label || "选择选项"}
          >
            {searchable && (
              <div className="p-2 border-b border-border-light dark:border-border-dark sticky top-0 bg-white dark:bg-neutral-900 z-10">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-1.5 text-sm border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  autoFocus
                />
              </div>
            )}
            <ul className="py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-text-tertiary">
                  {searchable ? "无匹配选项" : "暂无选项"}
                </li>
              ) : (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    ref={(el) => {
                      if (el) optionRefs.current.set(option.value, el);
                    }}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                    className={cn(
                      "px-4 py-2 text-sm cursor-pointer transition-colors",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      option.value === value
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium"
                        : "text-text-primary",
                      option.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !option.disabled && handleOptionClick(option.value)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                      {option.value === value && (
                        <Check className="h-4 w-4 flex-shrink-0" />
                      )}
                    </div>
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
      {/* Hidden native select for form submission */}
      <select
        id={`${selectId}-native`}
        value={value || ""}
        onChange={onChange}
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
interface MultiSelectProps extends Omit<SelectProps, "onChange"> {
  value: string[];
  onChange: (values: string[]) => void;
  maxSelected?: number;
}

export function MultiSelect({
  className,
  label,
  error,
  hint,
  placeholder = "请选择...",
  options,
  allowClear = true,
  searchable = true,
  maxHeight = 200,
  id,
  disabled,
  required,
  value = [],
  onChange,
  onBlur,
  maxSelected,
  ...props
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const selectRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  const handleClickOutside = React.useCallback(
    (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    },
    []
  );

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (event.key === "Backspace" && value.length > 0 && !searchQuery) {
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

  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-input-label mb-1.5"
        >
          {label}
          {required && (
            <span className="text-error-500 ml-1" aria-hidden="true">*</span>
          )}
        </label>
      )}
      <div
        ref={selectRef}
        className="relative"
        onKeyDown={handleKeyDown}
      >
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
          onBlur={onBlur}
          className={cn(
            "w-full flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border bg-input-bg text-text-primary min-h-[44px]",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-input-border-error focus-visible:ring-error-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              : "border-input-border hover:border-input-border-hover focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
            className
          )}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium"
            >
              {option.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(option.value, e)}
                  className="p-0.5 rounded hover:bg-primary-200/50 dark:hover:bg-primary-800/50"
                  aria-label={`移除 ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {value.length === 0 && (
            <span className="flex-1 text-text-tertiary">{placeholder}</span>
          )}
          {allowClear && value.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="清除所有"
            >
              <X className="h-4 w-4 text-text-tertiary" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-tertiary transition-transform duration-150 flex-shrink-0 ml-auto",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-[1500] w-full mt-1.5 max-h-60 overflow-auto rounded-lg border border-border-light dark:border-border-dark bg-white dark:bg-neutral-900 shadow-lg animate-scale-in"
            )}
            style={{ maxHeight: maxHeight }}
            role="listbox"
            aria-label={label || "选择选项"}
          >
            {searchable && (
              <div className="p-2 border-b border-border-light dark:border-border-dark sticky top-0 bg-white dark:bg-neutral-900 z-10">
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-1.5 text-sm border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  autoFocus
                />
              </div>
            )}
            <ul className="py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-center text-sm text-text-tertiary">
                  {searchable ? "无匹配选项" : "暂无选项"}
                </li>
              ) : (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={value.includes(option.value)}
                    aria-disabled={option.disabled}
                    className={cn(
                      "px-4 py-2 text-sm cursor-pointer transition-colors flex items-center gap-2",
                      "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                      value.includes(option.value)
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium"
                        : "text-text-primary",
                      option.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !option.disabled && handleOptionClick(option.value)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        value.includes(option.value)
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-transparent"
                      )}
                    />
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <span className="truncate flex-1">{option.label}</span>
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