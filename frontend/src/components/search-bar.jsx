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
      className="flex items-start gap-3 p-3 hover:bg-accent/10 cursor-pointer transition-colors"
    >
      {result.image || result.logoUrl ? (
        <img
          src={result.image || result.logoUrl}
          alt={result.name}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs sm:text-sm font-medium text-accent">
            {result.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-foreground text-sm sm:text-base truncate">
            {result.name}
          </h3>
          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-mono flex-shrink-0">
            ${result.tokenSymbol}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {result.tokenAddress && (
            <span className="text-xs text-muted-foreground font-mono">
              {ellipsizeAddress(result.tokenAddress)}
            </span>
          )}
        </div>

        {result.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[50vh] sm:max-h-[70vh] md:max-h-96 overflow-y-auto overscroll-contain"
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
              <p className="text-xs mt-1">
                Try searching by agent name, token symbol, or address
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              <div className="px-3 py-2 border-b border-border bg-muted/50">
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
                  <div className="p-3 text-center border-t border-border bg-muted/30">
                    <button
                      onClick={() => {
                        // Navigate to full search results page (when implemented)
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        handleResultClick();
                      }}
                      className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
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
