"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { MetaPage } from "@/lib/meta/page-search";

interface PageSearchInputProps {
  disabled?: boolean;
  onSearch: (query: string, pageId?: string) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function PageSearchInput({ disabled, onSearch }: PageSearchInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [fallbackMode, setFallbackMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Fetch page suggestions when input changes
  useEffect(() => {
    if (selectedPage) return; // already selected, don't re-fetch
    if (debouncedInput.trim().length < 2) {
      setPages([]);
      setOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setFallbackMode(false);

    fetch(
      `/api/meta/page-search?query=${encodeURIComponent(debouncedInput.trim())}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data: { pages: MetaPage[] }) => {
        const results = data.pages ?? [];
        setPages(results);
        setOpen(results.length > 0 || debouncedInput.trim().length >= 2);
        setHighlightIndex(-1);
        if (results.length === 0) setFallbackMode(true);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setFallbackMode(true);
          setOpen(false);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedInput, selectedPage]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectPage = useCallback((page: MetaPage) => {
    setSelectedPage(page);
    setInputValue(page.name);
    setOpen(false);
    setPages([]);
    setFallbackMode(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPage(null);
    setInputValue("");
    setPages([]);
    setOpen(false);
    setFallbackMode(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || pages.length === 0) {
      if (e.key === "Enter") triggerSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, pages.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && pages[highlightIndex]) {
        selectPage(pages[highlightIndex]);
      } else {
        triggerSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const triggerSearch = () => {
    const q = selectedPage?.name ?? inputValue.trim();
    if (!q) return;
    onSearch(q, selectedPage?.page_id);
  };

  const isVerified = (page: MetaPage) =>
    page.verification_status === "verified" ||
    page.verification_status === "blue_verified";

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[250px]">
      {/* Input row */}
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          placeholder="Search brand name (e.g. Nike, Glossier)..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (selectedPage) setSelectedPage(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (pages.length > 0 && !selectedPage) setOpen(true);
          }}
          className="pl-8 pr-8"
          disabled={disabled}
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selected page chip */}
      {selectedPage && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {selectedPage.image_uri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedPage.image_uri}
              alt=""
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <Badge variant="secondary" className="text-xs gap-1">
            {selectedPage.name}
            {isVerified(selectedPage) && (
              <CheckCircle className="h-3 w-3 text-blue-500" />
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="ml-0.5 hover:text-foreground"
              tabIndex={-1}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <span className="text-xs text-muted-foreground">
            ID: {selectedPage.page_id}
          </span>
        </div>
      )}

      {/* Fallback warning */}
      {fallbackMode && !selectedPage && inputValue.trim().length >= 2 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          No matching pages found. Showing keyword results (less accurate).
        </p>
      )}

      {/* Dropdown */}
      {open && pages.length > 0 && !selectedPage && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {pages.map((page, idx) => (
              <li
                key={page.page_id}
                role="option"
                aria-selected={idx === highlightIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPage(page);
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm transition-colors ${
                  idx === highlightIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                {/* Thumbnail */}
                {page.image_uri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.image_uri}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {page.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{page.name}</span>
                    {isVerified(page) && (
                      <CheckCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  {page.category && (
                    <p className="text-xs text-muted-foreground truncate">
                      {page.category}
                    </p>
                  )}
                </div>

                {/* Page ID badge */}
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {page.page_id}
                </span>
              </li>
            ))}

            {/* Empty state */}
            {pages.length === 0 && !loading && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                No matching pages found. Try a different name.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
