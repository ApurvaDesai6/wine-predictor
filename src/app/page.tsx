'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Wine, Camera, Star, TrendingDown, TrendingUp,
  CheckCircle, X, Loader2, Sparkles, RefreshCw,
  ChevronRight, ExternalLink, AlertCircle, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WinePurchaseModal } from '@/components/wine/WinePurchaseModal';

// Types
interface ScanResult {
  success: boolean;
  wine: {
    name: string;
    variety: string;
    region: string;
    country: string;
    province: string;
    vintage: string;
    rating: number;
    predicted_price: number;
    confidence: string;
    tasting_notes: string;
    winery?: string;
    listed_price?: number;
  };
}

interface PredictionResponse {
  success: boolean;
  prediction: {
    price: number;
    confidence_interval: [number, number];
    price_range: { low: number; high: number };
    top_factors: string[];
  };
  verdict?: {
    verdict: 'great_deal' | 'fair' | 'overpriced';
    difference: number;
    percentage: number;
  };
}

interface LivePrice {
  price: number;
  merchant: string;
  url: string;
}

// Verdict Badge Component
function VerdictBadge({ verdict }: { verdict: 'great_deal' | 'fair' | 'overpriced' }) {
  const config = {
    great_deal: {
      label: 'Great Value',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: TrendingDown,
    },
    fair: {
      label: 'Fair Price',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: CheckCircle,
    },
    overpriced: {
      label: 'Overpriced',
      className: 'bg-red-500/15 text-red-400 border-red-500/30',
      icon: TrendingUp,
    },
  };

  const { label, className, icon: Icon } = config[verdict];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${className}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

// Rating Display Component
function RatingDisplay({ rating, size = 'default' }: { rating: number; size?: 'default' | 'large' }) {
  const starSize = size === 'large' ? 'w-6 h-6' : 'w-5 h-5';
  const textSize = size === 'large' ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rating >= star;
          const partial = rating > star - 1 && rating < star;
          const fillPercentage = partial ? ((rating - (star - 1)) * 100) : (filled ? 100 : 0);

          return (
            <div key={star} className={`relative ${starSize}`}>
              <Star className="absolute w-full h-full text-slate-600" strokeWidth={0} fill="currentColor" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                <Star className="w-full h-full text-amber-400" strokeWidth={0} fill="currentColor" />
              </div>
            </div>
          );
        })}
      </div>
      <span className={`font-bold text-amber-400 tabular-nums ${textSize}`}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// Main Component
export default function WineScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live prices after scan
  const fetchLivePrices = useCallback(async (wineName: string, vintage?: string) => {
    setLoadingPrices(true);
    try {
      const params = new URLSearchParams({
        name: wineName,
        vintage: vintage || '',
      });
      const response = await fetch(`/api/wine-search?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.results?.length > 0) {
        // Filter to only results with valid prices
        const validPrices = data.results
          .filter((r: LivePrice) => r.price > 0)
          .slice(0, 3);
        setLivePrices(validPrices);

        // If we found live prices, use the lowest one as the listed price
        if (validPrices.length > 0 && !scanResult?.wine?.listed_price) {
          const lowestPrice = validPrices.reduce((min: LivePrice, p: LivePrice) =>
            p.price < min.price ? p : min
          );
          return lowestPrice.price;
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch live prices:', err);
      return null;
    } finally {
      setLoadingPrices(false);
    }
  }, [scanResult]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      const reader = new FileReader();
      reader.onloadend = () => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 768;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
            else { w = Math.round(w * MAX / h); h = MAX; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          console.log('Compressed image size:', Math.round(compressed.length / 1024), 'KB');
          setUploadedImage(compressed);
          setScanResult(null);
          setPrediction(null);
          setLivePrices([]);
          setError(null);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanLabel = async () => {
    if (!uploadedImage) return;

    setScanning(true);
    setError(null);
    setPrediction(null);
    setLivePrices([]);

    try {
      // Debug: log image size
      const imgSize = Math.round(uploadedImage.length / 1024);
      console.log('Sending image to scan-label, size:', imgSize, 'KB');

      // Step 1: Scan the label
      let scanResponse: Response;
      try {
        scanResponse = await fetch('/api/scan-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: uploadedImage }),
        });
      } catch (fetchErr: any) {
        throw new Error(`Network error (image ${imgSize}KB): ${fetchErr.message}`);
      }

      let scanData: ScanResult;
      try {
        scanData = await scanResponse.json();
      } catch (jsonErr: any) {
        const text = await scanResponse.text().catch(() => 'unreadable');
        throw new Error(`Invalid response (status ${scanResponse.status}): ${text.slice(0, 100)}`);
      }

      if (!scanData.success) {
        throw new Error(scanData.error || 'Label analysis failed');
      }

      setScanResult(scanData);

      // Step 2: Get prediction with wine data
      const wine = scanData.wine;
      const predictResponse = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wine: {
            variety: wine.variety,
            country: wine.country,
            region: wine.region,
            province: wine.province,
            points: Math.round(80 + (wine.rating / 5) * 20),
            tasting_notes: wine.tasting_notes,
            listed_price: wine.listed_price,
          },
        }),
      });

      const predictData: PredictionResponse = await predictResponse.json();
      setPrediction(predictData);

      // Step 3: Fetch live prices to validate
      const livePrice = await fetchLivePrices(wine.name, wine.vintage);

      // If we found a live price and no listed price was on label, update prediction
      if (livePrice && !wine.listed_price) {
        const updatedPredictResponse = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wine: {
              variety: wine.variety,
              country: wine.country,
              region: wine.region,
              province: wine.province,
              points: Math.round(80 + (wine.rating / 5) * 20),
              tasting_notes: wine.tasting_notes,
              listed_price: livePrice,
            },
          }),
        });
        const updatedData: PredictionResponse = await updatedPredictResponse.json();
        setPrediction(updatedData);
      }

    } catch (err) {
      console.error('Scan error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan label');
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setScanResult(null);
    setPrediction(null);
    setLivePrices([]);
    setError(null);
    setShowPurchaseModal(false);
  };

  const wineName = scanResult?.wine?.name || '';
  const wineVariety = scanResult?.wine?.variety || '';
  const wineVintage = scanResult?.wine?.vintage || '';
  const wineRegion = scanResult?.wine?.region || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Wine className="w-5 h-5 text-accent-primary" />
            </div>
            <span className="font-semibold text-lg text-foreground">WineValue</span>
          </div>
          <Link
            href="/insights"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>How it works</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Is This Wine Fairly Priced?
          </h1>
          <p className="text-muted-foreground text-sm">
            Scan any wine label to get an instant price analysis powered by ML
          </p>
        </div>

        {/* Scanner Card */}
        <Card className="card-base overflow-hidden">
          <CardContent className="p-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {!uploadedImage ? (
                <motion.button
                  key="upload"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-4 cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-accent-primary/50 bg-background-tertiary/30 hover:bg-background-tertiary/50 transition-all mx-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Camera className="w-10 h-10 text-accent-primary" />
                  </motion.div>
                  <div className="text-center px-4">
                    <p className="text-foreground font-medium text-lg">
                      Tap to scan wine label
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Take a photo or upload from gallery
                    </p>
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="image"
                  className="p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative rounded-xl overflow-hidden bg-background-tertiary">
                    <img
                      src={uploadedImage}
                      alt="Wine label"
                      className="w-full max-h-56 object-contain"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {!prediction ? (
                      <motion.div
                        key="scan-btn"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4"
                      >
                        <Button
                          onClick={handleScanLabel}
                          disabled={scanning}
                          className="w-full py-4 btn-primary text-base"
                        >
                          {scanning ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Analyze Label
                            </>
                          )}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4"
                      >
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="w-full py-3"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Scan Another Wine
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-destructive font-medium">Scan Error</p>
                      <p className="text-destructive/80 text-sm mt-0.5">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence>
          {prediction && scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Wine Info */}
              <Card className="card-base">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-foreground truncate">
                        {wineName}
                      </h2>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {wineVariety && <span>{wineVariety}</span>}
                        {wineVintage && wineVintage !== 'NV' && <span> • {wineVintage}</span>}
                        {wineRegion && <span> • {wineRegion}</span>}
                      </p>
                    </div>
                    {prediction.verdict && (
                      <VerdictBadge verdict={prediction.verdict.verdict} />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <RatingDisplay rating={scanResult.wine.rating} />
                  </div>
                </CardContent>
              </Card>

              {/* Price Analysis */}
              <Card className="card-base">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fair Market Value</span>
                    <span className="text-3xl font-bold text-accent-primary tabular-nums">
                      ${prediction.prediction.price}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Typical Range</span>
                    <span className="text-foreground tabular-nums">
                      ${prediction.prediction.price_range.low} - ${prediction.prediction.price_range.high}
                    </span>
                  </div>

                  {/* Live Prices Section */}
                  {loadingPrices ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking live prices...
                    </div>
                  ) : livePrices.length > 0 ? (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Live prices found:</p>
                      <div className="space-y-2">
                        {livePrices.slice(0, 2).map((lp, i) => (
                          <a
                            key={i}
                            href={lp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-background-tertiary/50 hover:bg-background-tertiary transition-colors"
                          >
                            <span className="text-sm text-foreground">{lp.merchant}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground tabular-nums">
                                ${lp.price}
                              </span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Verdict Message */}
                  {prediction.verdict && (
                    <div className={`p-4 rounded-xl ${
                      prediction.verdict.verdict === 'great_deal'
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : prediction.verdict.verdict === 'overpriced'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-amber-500/10 border border-amber-500/20'
                    }`}>
                      {prediction.verdict.verdict === 'great_deal' && (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <TrendingDown className="w-5 h-5" />
                          <span className="font-medium">
                            ${Math.abs(prediction.verdict.difference)} below fair value
                          </span>
                        </div>
                      )}
                      {prediction.verdict.verdict === 'fair' && (
                        <div className="flex items-center gap-2 text-amber-400">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">
                            Price is within fair range
                          </span>
                        </div>
                      )}
                      {prediction.verdict.verdict === 'overpriced' && (
                        <div className="flex items-center gap-2 text-red-400">
                          <TrendingUp className="w-5 h-5" />
                          <span className="font-medium">
                            ${prediction.verdict.difference} above fair value
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Factors */}
                  {prediction.prediction.top_factors.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Price factors:</p>
                      <div className="space-y-1.5">
                        {prediction.prediction.top_factors.map((factor, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <div className="w-5 h-5 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary text-xs font-semibold">
                              {i + 1}
                            </div>
                            <span className="text-foreground">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="flex-1 py-3 btn-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Find This Wine
                </Button>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 px-1">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Fair value estimate based on ML analysis of 130k+ wines.
                  Always compare with current retail prices before purchasing.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial State */}
        {!uploadedImage && !prediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card className="card-base">
              <CardContent className="p-5">
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wine className="w-6 h-6 text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground text-center mb-2">
                  How It Works
                </h3>
                <p className="text-muted-foreground text-sm text-center mb-5">
                  Our ML model analyzes wine labels to estimate fair market value
                  based on variety, region, quality, and more.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <TrendingDown className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                    <div className="text-xs text-emerald-400 font-medium">Great Value</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">15%+ below</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                    <CheckCircle className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                    <div className="text-xs text-amber-400 font-medium">Fair Price</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Within range</div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                    <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
                    <div className="text-xs text-red-400 font-medium">Overpriced</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">15%+ above</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/insights"
                className="flex items-center justify-between p-4 rounded-xl bg-background-secondary border border-border hover:border-accent-primary/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">Model Insights</p>
                  <p className="text-sm text-muted-foreground">Explore the ML research behind predictions</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
              <Link
                href="/architecture"
                className="flex items-center justify-between p-4 rounded-xl bg-background-secondary border border-border hover:border-accent-primary/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">Technical Architecture</p>
                  <p className="text-sm text-muted-foreground">How VLM and ML models work together</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 mt-8 border-t border-border">
        <Link
          href="/insights"
          className="text-sm text-muted-foreground hover:text-accent-primary transition-colors block mb-2"
        >
          Powered by ML • Trained on 130,000+ wine reviews
        </Link>
        <p className="text-sm text-muted-foreground/60 italic">
          À votre santé — Apurva Desai
        </p>
      </footer>

      {/* Purchase Modal */}
      <WinePurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        wineName={wineName}
        variety={wineVariety}
        vintage={wineVintage}
        region={wineRegion}
        fairPrice={prediction?.prediction?.price}
      />
    </div>
  );
}
