'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, ShoppingCart, Loader2, Star,
  MapPin, AlertCircle, Wine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WineSearchResult {
  name: string;
  merchant: string;
  price: number;
  url: string;
  rating?: number;
  vintage?: string;
  region?: string;
}

interface WinePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  wineName: string;
  variety?: string;
  vintage?: string;
  region?: string;
  fairPrice?: number;
}

export function WinePurchaseModal({
  isOpen,
  onClose,
  wineName,
  variety,
  vintage,
  region,
  fairPrice
}: WinePurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WineSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && wineName) {
      searchWine();
    }
  }, [isOpen, wineName]);

  const searchWine = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const params = new URLSearchParams({
        name: wineName,
        variety: variety || '',
        vintage: vintage || '',
        region: region || ''
      });
      
      const response = await fetch(`/api/wine-search?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setSources(data.sources);
      } else {
        setError(data.error || 'Failed to search for wine');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to search for wine prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'See site';
    return `$${price.toFixed(0)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-background-secondary border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Find This Wine</h3>
                  <p className="text-sm text-muted-foreground">Compare prices from retailers</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Wine Info */}
            <div className="px-4 py-3 bg-background-tertiary/50 border-b border-border">
              <p className="font-medium text-foreground truncate">{wineName}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {variety && (
                  <span className="text-xs text-muted-foreground">{variety}</span>
                )}
                {vintage && (
                  <Badge variant="outline" className="text-xs h-5">
                    {vintage}
                  </Badge>
                )}
                {region && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {region}
                  </span>
                )}
              </div>
              {fairPrice && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Fair Price: </span>
                  <span className="font-semibold text-accent-primary">${fairPrice.toFixed(0)}</span>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Searching retailers...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <AlertCircle className="w-10 h-10 text-destructive mb-3" />
                  <p className="text-sm text-muted-foreground text-center">{error}</p>
                  <Button
                    onClick={searchWine}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Wine className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    No results found. Try searching manually on Wine-Searcher.
                  </p>
                  <a
                    href={`https://www.wine-searcher.com/find/${encodeURIComponent(wineName)}${vintage ? `/${vintage}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4"
                  >
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Search Wine-Searcher
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {results.map((result, index) => (
                    <motion.a
                      key={result.url}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 hover:bg-background-tertiary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {result.merchant}
                          </p>
                          {result.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-accent-primary fill-accent-primary" />
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {result.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {result.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-semibold tabular-nums ${
                          result.price && fairPrice && result.price < fairPrice
                            ? 'text-semantic-success'
                            : 'text-foreground'
                        }`}>
                          {formatPrice(result.price)}
                        </span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.a>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {results.length > 0 && (
              <div className="p-4 border-t border-border bg-background-tertiary/30">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {sources.slice(0, 4).map((source) => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                    {sources.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{sources.length - 4} more
                      </Badge>
                    )}
                  </div>
                  <a
                    href={`https://www.wine-searcher.com/find/${encodeURIComponent(wineName)}${vintage ? `/${vintage}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-primary hover:underline flex items-center gap-1"
                  >
                    View all
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WinePurchaseModal;
