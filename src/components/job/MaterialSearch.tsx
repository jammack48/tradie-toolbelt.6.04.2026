import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchSupplierItems, type SupplierItem } from "@/services/supplierService";

interface MaterialSearchProps {
  onSelect: (item: SupplierItem) => void;
}

export function MaterialSearch({ onSelect }: MaterialSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierItem[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSearch = async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      setSearching(true);
      const items = await searchSupplierItems(term);
      setResults(items);
      setOpen(true);
    } catch (e) {
      console.error("Material search failed", e);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void doSearch(val), 300);
  };

  const handleSelect = (item: SupplierItem) => {
    onSelect(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search materials..."
          className="pl-8 h-9 text-sm"
          onFocus={() => { if (results.length > 0) setOpen(true); }}
        />
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {searching ? (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">No items found</div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border last:border-0"
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-primary">{item.supplier_name}</span>
                    <p className="text-sm text-card-foreground truncate">{item.name}</p>
                    {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                  </div>
                  <span className="text-sm font-semibold text-card-foreground shrink-0">
                    ${item.sell_price.toFixed(2)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
