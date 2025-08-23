import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useSearch } from "../shared/hooks/useSearch";
import { useNavigate } from "react-router";
import { ellipsizeAddress } from "@/lib/utils";

const SearchResultItem = ({ result, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/agents/${result.uniqueId}`);
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className="custom-scrollbar flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-accent/10"
    >
      {result.image || result.logoUrl ? (
        <img
          src={result.image || result.logoUrl}
          alt={result.name}
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
        />
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 sm:h-10 sm:w-10">
          <span className="text-xs font-medium text-accent sm:text-sm">
            {result.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium text-foreground sm:text-base">
            {result.name}
          </h3>
          <span className="flex-shrink-0 rounded-full bg-accent/20 px-2 py-1 font-mono text-xs text-accent">
            ${result.tokenSymbol}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2">
          {result.tokenAddress && (
            <span className="font-mono text-xs text-muted-foreground">
              {ellipsizeAddress(result.tokenAddress)}
            </span>
          )}
        </div>

        {result.description && (
          <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
            {result.description}
          </p>
        )}
      </div>
    </div>
  );
};

const SearchBar = ({
  placeholder = "Search agents, tokens...",
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { results, count, isLoading, hasQuery } = useSearch(query, {
    enabled: isOpen && query.length >= 2,
    debounceDelay: 300,
    limit: 8,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length >= 2);

    // Scroll dropdown to top when query changes
    if (dropdownRef.current) {
      dropdownRef.current.scrollTop = 0;
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background py-2 pr-10 pl-10 text-foreground placeholder-muted-foreground focus:border-transparent focus:ring-2 focus:ring-accent focus:outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[50vh] overflow-y-auto overscroll-contain rounded-lg border border-border bg-background shadow-lg sm:max-h-[70vh] md:max-h-96"
        >
          {isLoading && hasQuery && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Searching...
              </span>
            </div>
          )}

          {!isLoading && hasQuery && results.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="mt-1 text-xs">
                Try searching by agent name, token symbol, or address
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              <div className="border-b border-border bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {count} result{count !== 1 ? "s" : ""} found
                  {count > results.length && (
                    <span className="ml-2 text-accent">
                      (showing first {results.length})
                    </span>
                  )}
                </p>
              </div>
              <div className="divide-y divide-border">
                {results.map((result) => (
                  <SearchResultItem
                    key={result.uniqueId || result.tokenAddress}
                    result={result}
                    onClick={handleResultClick}
                  />
                ))}
                {count > results.length && (
                  <div className="border-t border-border bg-muted/30 p-3 text-center">
                    <button
                      onClick={() => {
                        // Navigate to full search results page (when implemented)
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        handleResultClick();
                      }}
                      className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
                    >
                      View all {count} results →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!hasQuery && query.length > 0 && query.length < 2 && (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
