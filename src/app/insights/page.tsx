'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, BarChart3, TrendingUp, Brain,
  Database, Target, AlertCircle, CheckCircle, Info,
  Star, MapPin, Users, Wine, ChevronDown,
  TrendingDown, Award, Filter, ExternalLink, ShoppingCart,
  Search, Sparkles, RefreshCw, Play, Calculator
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WinePurchaseModal } from '@/components/wine/WinePurchaseModal';

// Types
interface ModelData {
  models: Array<{
    name: string;
    type: string;
    metrics: { r2_score: number; rmse: number; mae: number; };
    is_baseline?: boolean;
  }>;
  best_model: string;
  improvement_over_baseline: { r2_improvement: string; rmse_improvement: string; };
  dataset_info: { total_samples: number; features_used: number; };
  feature_engineering: { nlp_features: number; target_encoded_features: number; interaction_features: number; original_features: number; };
}

interface ShapData {
  price_model: { features: Array<{ feature: string; importance: number; direction: string; description: string; }>; };
  insights: { top_price_drivers: string[]; nlp_impact: string; regional_premium: string; };
}

interface UndervaluedWine {
  rank: number;
  title: string;
  variety: string;
  country: string;
  province: string;
  region_1: string;
  points: number;
  actual_price: number;
  predicted_price: number;
  undervalued_score: number;
  description: string;
}

interface Taster {
  name: string;
  total_reviews: number;
  avg_rating_given: number;
  bias_score: number;
  bias_direction: string;
  favorite_regions: string[];
  favorite_varieties: string[];
  style_notes: string;
}

// Animated Progress Bar
function AnimatedProgress({ value, max, color = 'bg-rose-400', delay = 0 }: { value: number; max: number; color?: string; delay?: number }) {
  return (
    <div className="h-2 bg-[#1a1416] rounded-full overflow-hidden border border-[rgba(168,50,74,0.2)]">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
  );
}

// SHAP Feature Bar with Tooltip
function ShapFeatureBar({ feature, index }: { feature: { feature: string; importance: number; direction: string; description: string; }; index: number; }) {
  const isPositive = feature.direction === 'higher_increases_price';
  const barColor = isPositive ? 'bg-rose-400' : 'bg-violet-400';
  const bgColor = isPositive ? 'bg-rose-400/10' : 'bg-violet-400/10';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#e8d8d8] truncate max-w-[200px] sm:max-w-[240px]" title={feature.feature}>
          {feature.feature}
        </span>
        <span className="text-sm text-[#a89999] tabular-nums font-mono">
          {(feature.importance * 100).toFixed(1)}%
        </span>
      </div>
      <div className={`relative h-6 ${bgColor} rounded-lg overflow-hidden border border-[rgba(168,50,74,0.15)]`}>
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-lg ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${feature.importance * 300}%` }}
          transition={{ duration: 0.6, delay: index * 0.04 }}
        />
      </div>
      
      {/* Tooltip */}
      <div className="absolute left-0 right-0 -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="bg-[#1a1416] border border-[rgba(168,50,74,0.3)] rounded-lg px-3 py-2 text-xs text-[#e8d8d8] shadow-lg">
          {feature.description}
        </div>
      </div>
    </motion.div>
  );
}

// Model Performance Card
function ModelCard({ model, isBest, isBaseline }: { model: ModelData['models'][0]; isBest: boolean; isBaseline: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl transition-all ${
        isBest ? 'bg-[rgba(168,50,74,0.15)] border border-[rgba(168,50,74,0.4)] shadow-[0_0_20px_rgba(168,50,74,0.2)]' :
        isBaseline ? 'bg-[#1a1416]/50 border border-[rgba(168,50,74,0.15)]' :
        'bg-[#1a1416]/80 border border-[rgba(168,50,74,0.2)]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{model.name}</span>
          {isBest && <Badge className="bg-[#a8324a] text-white text-[10px] px-2 py-0.5">Best</Badge>}
          {isBaseline && <Badge className="bg-[#2d2426] text-[#a89999] text-[10px] px-2 py-0.5">Baseline</Badge>}
        </div>
        <span className="text-xs text-[#a89999]">{model.type}</span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#a89999]">R² Score</span>
            <span className="text-white font-mono tabular-nums font-semibold">{model.metrics.r2_score.toFixed(3)}</span>
          </div>
          <AnimatedProgress value={model.metrics.r2_score} max={1} color={isBest ? 'bg-rose-400' : 'bg-[#c9a227]'} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#a89999]">RMSE</span>
            <span className="text-white font-mono tabular-nums font-semibold">${model.metrics.rmse.toFixed(0)}</span>
          </div>
          <AnimatedProgress value={100 - model.metrics.rmse} max={100} color="bg-violet-400" delay={0.1} />
        </div>
      </div>
    </motion.div>
  );
}

// Taster Bias Row
function TasterRow({ taster, index }: { taster: Taster; index: number }) {
  const isPositive = taster.bias_score > 0;
  const biasColor = isPositive ? 'text-emerald-400' : 'text-red-400';
  const biasBg = isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 bg-[#1a1416]/30 hover:bg-[#1a1416]/50 rounded-xl transition-colors"
    >
      <div className="w-28 flex-shrink-0">
        <p className="text-sm font-medium text-white truncate" title={taster.name}>{taster.name}</p>
        <p className="text-[11px] text-[#a89999]">{taster.total_reviews.toLocaleString()} reviews</p>
      </div>

      <div className="flex-1 h-6 bg-[#1a1416]/50 rounded-lg overflow-hidden relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-[#2d2426]" />
        <motion.div
          className={`absolute inset-y-0 ${isPositive ? 'left-1/2' : 'right-1/2'} ${biasBg} rounded-lg`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.abs(taster.bias_score) / 2 * 100}%` }}
          transition={{ duration: 0.5, delay: index * 0.03 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-mono font-bold ${biasColor}`}>
            {isPositive ? '+' : ''}{taster.bias_score.toFixed(1)}
          </span>
        </div>
      </div>

      <Badge className={`w-20 justify-center text-[10px] ${
        isPositive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
        taster.bias_score < 0 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
        'bg-[#2d2426] text-[#c9b9b9]'
      }`}>
        {taster.bias_direction.replace('_', ' ')}
      </Badge>
    </motion.div>
  );
}

// Wine Discovery Card with Purchase Modal
function WineDiscoveryCard({ wine, onFindWine }: { wine: UndervaluedWine; onFindWine: () => void }) {
  const savings = wine.predicted_price - wine.actual_price;
  const savingsPercent = Math.round((savings / wine.actual_price) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 bg-[#1a1416]/30 hover:bg-[#1a1416]/50 rounded-xl border border-[rgba(168,50,74,0.15)]/50 hover:border-emerald-500/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate mb-1" title={wine.title}>{wine.title}</h4>
          <p className="text-sm text-[#c9b9b9]">{wine.variety} • {wine.region_1}</p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0">
          <TrendingDown className="w-3 h-3 mr-1" />
          {savingsPercent}% off
        </Badge>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-[#e87a8c] fill-amber-400" />
          <span className="text-sm text-white tabular-nums font-medium">{(wine.points / 20).toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#a89999]" />
          <span className="text-sm text-[#c9b9b9]">{wine.country}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-[#a89999] block mb-0.5">Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tabular-nums">${wine.actual_price}</span>
            <span className="text-sm text-[#a89999] line-through tabular-nums">${wine.predicted_price}</span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onFindWine}
          className="bg-[#a8324a] hover:bg-[#a8324a] text-slate-900 font-semibold"
        >
          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
          Find Wine
        </Button>
      </div>

      <p className="text-xs text-[#a89999] mt-3 italic line-clamp-2">{wine.description}</p>
    </motion.div>
  );
}

// Price Predictor Demo
function PricePredictorDemo() {
  const [points, setPoints] = useState(88);
  const [variety, setVariety] = useState('Pinot Noir');
  const [region, setRegion] = useState('Napa Valley');
  const [predictedPrice, setPredictedPrice] = useState(45);

  const varieties = ['Pinot Noir', 'Cabernet Sauvignon', 'Chardonnay', 'Merlot', 'Syrah', 'Riesling', 'Sauvignon Blanc'];
  const regions = ['Napa Valley', 'Sonoma', 'Bordeaux', 'Burgundy', 'Tuscany', 'Rioja', 'Mendoza'];

  useEffect(() => {
    // Simulate price prediction
    let base = 15;
    base += (points - 80) * 2.5;
    
    const varietyPremiums: Record<string, number> = {
      'Pinot Noir': 12, 'Cabernet Sauvignon': 15, 'Chardonnay': 8,
      'Merlot': 3, 'Syrah': 6, 'Riesling': 4, 'Sauvignon Blanc': -2
    };
    base += varietyPremiums[variety] || 0;
    
    const regionPremiums: Record<string, number> = {
      'Napa Valley': 25, 'Bordeaux': 20, 'Burgundy': 22,
      'Sonoma': 15, 'Tuscany': 12, 'Rioja': 8, 'Mendoza': 4
    };
    base += regionPremiums[region] || 0;
    
    setPredictedPrice(Math.round(base + (Math.random() - 0.5) * 10));
  }, [points, variety, region]);

  return (
    <Card className="bg-[#1a1416] border-[rgba(168,50,74,0.2)] rounded-xl overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#e87a8c]" />
          Interactive Price Predictor
        </CardTitle>
        <p className="text-xs text-[#a89999]">Adjust parameters to see how price changes</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#c9b9b9]">Quality Score (Points)</span>
            <span className="text-white font-mono tabular-nums">{points}</span>
          </div>
          <input
            type="range"
            min="80"
            max="100"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value))}
            className="w-full h-2 bg-[#2d2426] rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#c9b9b9] block mb-1.5">Variety</label>
            <select
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="w-full bg-[#1a1416] border border-[rgba(168,50,74,0.15)] rounded-lg px-3 py-2 text-sm text-white"
            >
              {varieties.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#c9b9b9] block mb-1.5">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-[#1a1416] border border-[rgba(168,50,74,0.15)] rounded-lg px-3 py-2 text-sm text-white"
            >
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-[rgba(168,50,74,0.2)] rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#e87a8c] mb-1">Predicted Price</p>
              <p className="text-3xl font-bold text-white tabular-nums">${predictedPrice}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[rgba(168,50,74,0.15)] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#e87a8c]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Component
export default function ModelInsightsPage() {
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [shapData, setShapData] = useState<ShapData | null>(null);
  const [undervaluedWines, setUndervaluedWines] = useState<UndervaluedWine[]>([]);
  const [tasters, setTasters] = useState<Taster[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [sortBy, setSortBy] = useState<'score' | 'price' | 'points'>('score');
  const [filterCountry, setFilterCountry] = useState<string>('all');

  // Purchase modal
  const [selectedWine, setSelectedWine] = useState<UndervaluedWine | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modelRes, shapRes, undervaluedRes, tasterRes] = await Promise.all([
          fetch('/data/model_comparison.json'),
          fetch('/data/shap_importance.json'),
          fetch('/data/undervalued_wines.json'),
          fetch('/data/taster_bias.json')
        ]);

        const models = await modelRes.json();
        const shap = await shapRes.json();
        const undervalued = await undervaluedRes.json();
        const tasterData = await tasterRes.json();

        setModelData(models);
        setShapData(shap);
        setUndervaluedWines(undervalued.undervalued_wines || []);
        setTasters(tasterData.tasters || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFindWine = (wine: UndervaluedWine) => {
    setSelectedWine(wine);
    setPurchaseModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a0b] flex items-center justify-center antialiased">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12"
        >
          <Brain className="w-full h-full text-[#e87a8c]" />
        </motion.div>
      </div>
    );
  }

  const bestModel = modelData?.models.find(m => m.name === modelData.best_model);
  const countries = ['all', ...new Set(undervaluedWines.map(w => w.country))];

  const filteredWines = undervaluedWines
    .filter(w => filterCountry === 'all' || w.country === filterCountry)
    .sort((a, b) => {
      if (sortBy === 'score') return b.undervalued_score - a.undervalued_score;
      if (sortBy === 'price') return a.actual_price - b.actual_price;
      return b.points - a.points;
    });

  return (
    <div className="min-h-screen bg-[#0c0a0b] text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0a0b]/95 backdrop-blur-md border-b border-[rgba(168,50,74,0.2)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-[#c9b9b9] hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Scanner</span>
          </a>
          <a
            href="/data/wine_price_prediction_report.pdf"
            download
            className="flex items-center gap-2 px-4 py-2 btn-primary rounded-lg text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Report
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <Badge className="bg-[rgba(168,50,74,0.1)] text-[#e87a8c] border-[rgba(168,50,74,0.2)] mb-3">Research & Insights</Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Wine Price Prediction Model</h1>
          <p className="text-[#c9b9b9] text-sm max-w-xl mx-auto">
            Explore the ML model behind fair price predictions. Discover undervalued wines and understand what drives pricing.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { value: modelData?.dataset_info.total_samples.toLocaleString(), label: 'Samples', icon: Database },
            { value: modelData?.dataset_info.features_used, label: 'Features', icon: Target },
            { value: `${(bestModel?.metrics.r2_score || 0) * 100}%`, label: 'R² Score', icon: TrendingUp, accent: true },
            { value: modelData?.improvement_over_baseline.r2_improvement, label: 'vs Baseline', icon: Award },
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="card-base">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <m.icon className="w-4 h-4 text-[#e87a8c]" />
                    <span className={`text-lg sm:text-xl font-bold ${m.accent ? 'text-emerald-400' : 'text-white'} tabular-nums`}>{m.value}</span>
                  </div>
                  <p className="text-xs text-[#a89999] mt-1">{m.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto bg-[#1a1416] border border-[rgba(168,50,74,0.2)] rounded-xl p-1 h-11">
            {[
              { value: 'overview', label: 'Overview' },
              { value: 'features', label: 'Features' },
              { value: 'values', label: 'Values' },
              { value: 'tasters', label: 'Tasters' },
            ].map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-[#a8324a] data-[state=active]:text-slate-900 font-medium"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="card-base">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#e87a8c]" />
                    Model Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {modelData?.models.map((model) => (
                    <ModelCard
                      key={model.name}
                      model={model}
                      isBest={model.name === modelData.best_model}
                      isBaseline={model.is_baseline}
                    />
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="card-base">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#e87a8c]" />
                      Feature Engineering
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'TF-IDF NLP Features', value: modelData?.feature_engineering.nlp_features, color: 'bg-[#a8324a]' },
                      { label: 'Target Encoded', value: modelData?.feature_engineering.target_encoded_features, color: 'bg-emerald-400' },
                      { label: 'Interaction Features', value: modelData?.feature_engineering.interaction_features, color: 'bg-blue-400' },
                      { label: 'Original Features', value: modelData?.feature_engineering.original_features, color: 'bg-purple-400' },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-[#c9b9b9]">{item.label}</span>
                          <span className="text-white font-mono tabular-nums font-semibold">{item.value}</span>
                        </div>
                        <AnimatedProgress value={item.value || 0} max={50} color={item.color} delay={i * 0.1} />
                      </div>
                    ))}

                    <div className="p-3 bg-[rgba(168,50,74,0.1)] border border-[rgba(168,50,74,0.2)] rounded-xl mt-3">
                      <p className="text-xs text-[#e8d8d8]">{shapData?.insights.regional_premium}</p>
                    </div>
                  </CardContent>
                </Card>

                <PricePredictorDemo />
              </div>
            </div>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="card-base">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#e87a8c]" />
                      SHAP Feature Importance
                    </CardTitle>
                    <p className="text-xs text-[#a89999]">Hover over bars for detailed impact explanations</p>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-8">
                    {shapData?.price_model.features.slice(0, 12).map((f, i) => (
                      <ShapFeatureBar key={f.feature} feature={f} index={i} />
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="card-base">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#e87a8c]" />
                      Top Drivers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {shapData?.insights.top_price_drivers.map((driver, i) => (
                      <div key={driver} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[rgba(168,50,74,0.1)] flex items-center justify-center text-[#e87a8c] text-xs font-bold tabular-nums">
                          {i + 1}
                        </div>
                        <span className="text-sm text-[#e8d8d8] capitalize">{driver.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="text-emerald-400 text-sm font-medium">NLP Impact</p>
                        <p className="text-xs text-[#c9b9b9] mt-1">{shapData?.insights.nlp_impact}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Values Tab */}
          <TabsContent value="values" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#a89999]" />
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="select-base rounded-lg px-3 py-2 text-sm"
                >
                  {countries.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                {(['score', 'price', 'points'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      sortBy === s ? 'bg-[#a8324a] text-slate-900' : 'bg-[#1a1416] text-[#c9b9b9] hover:text-white'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wine Cards Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredWines.slice(0, 8).map((wine) => (
                <WineDiscoveryCard
                  key={wine.rank}
                  wine={wine}
                  onFindWine={() => handleFindWine(wine)}
                />
              ))}
            </div>

            {/* Regional Insights */}
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Card className="card-base">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#e87a8c]" />
                    Best Value Regions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { region: 'Willamette Valley', discount: 38 },
                    { region: 'Mendoza', discount: 35 },
                    { region: 'Stellenbosch', discount: 32 },
                    { region: 'Rioja', discount: 28 },
                    { region: 'Margaret River', discount: 26 },
                  ].map((item, i) => (
                    <div key={item.region} className="flex items-center gap-3">
                      <span className="w-4 text-[#a89999] text-xs tabular-nums">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-[#e8d8d8]">{item.region}</span>
                          <span className="text-emerald-400 font-medium tabular-nums">{item.discount}% avg</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1416] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${item.discount * 2}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="card-base">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Wine className="w-4 h-4 text-[#e87a8c]" />
                    Best Value Varieties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { variety: 'Tempranillo', discount: 34 },
                    { variety: 'Malbec', discount: 31 },
                    { variety: 'Riesling', discount: 29 },
                    { variety: 'Zinfandel', discount: 27 },
                    { variety: 'Rhône Blend', discount: 25 },
                  ].map((item, i) => (
                    <div key={item.variety} className="flex items-center gap-3">
                      <span className="w-4 text-[#a89999] text-xs tabular-nums">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-[#e8d8d8]">{item.variety}</span>
                          <span className="text-[#e87a8c] font-medium tabular-nums">{item.discount}% avg</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1416] rounded-full overflow-hidden">
                          <div className="h-full bg-[#a8324a] rounded-full" style={{ width: `${item.discount * 2}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tasters Tab */}
          <TabsContent value="tasters" className="space-y-4">
            <Card className="card-base">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#e87a8c]" />
                  Taster Bias Analysis
                </CardTitle>
                <p className="text-xs text-[#a89999]">How critics rate compared to model predictions</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasters.map((t, i) => (
                  <TasterRow key={t.name} taster={t} index={i} />
                ))}
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-3 gap-3">
              <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
                <CardContent className="p-4">
                  <TrendingUp className="w-6 h-6 text-emerald-400 mb-2" />
                  <p className="text-emerald-400 text-xs font-medium">Most Generous</p>
                  <p className="text-white font-semibold">Anna Lee C. Iijima</p>
                  <p className="text-xs text-[#a89999]">+1.6 bias score</p>
                </CardContent>
              </Card>

              <Card className="bg-red-500/10 border-red-500/20 rounded-xl">
                <CardContent className="p-4">
                  <TrendingDown className="w-6 h-6 text-red-400 mb-2" />
                  <p className="text-red-400 text-xs font-medium">Most Critical</p>
                  <p className="text-white font-semibold">Michael Schachner</p>
                  <p className="text-xs text-[#a89999]">-1.3 bias score</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-500/10 border-blue-500/20 rounded-xl">
                <CardContent className="p-4">
                  <Award className="w-6 h-6 text-blue-400 mb-2" />
                  <p className="text-blue-400 text-xs font-medium">Most Consistent</p>
                  <p className="text-white font-semibold">Jim Gordon</p>
                  <p className="text-xs text-[#a89999]">0.1 bias score</p>
                </CardContent>
              </Card>
            </div>

            <Card className="card-base">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#e87a8c] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Impact on Model</p>
                    <p className="text-xs text-[#c9b9b9] mt-1">
                      Taster identity accounts for 17.8% of rating variance. Critics show clear bias toward their regions of expertise.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Download CTA */}
        <div className="text-center py-8 mt-8 border-t border-[rgba(168,50,74,0.2)]">
          <a
            href="/data/wine_price_prediction_report.pdf"
            download
            className="inline-flex items-center gap-2 px-6 py-3 btn-primary rounded-xl font-semibold"
          >
            <Download className="w-4 h-4" />
            Download Research Report
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">ML Wine Price Prediction • Research Portfolio</p>
        <p className="text-xs text-muted-foreground/60 italic">À votre santé — Apurva Desai</p>
      </footer>

      {/* Purchase Modal */}
      <WinePurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        wineName={selectedWine?.title || ''}
        variety={selectedWine?.variety}
        predictedPrice={selectedWine?.predicted_price}
      />
    </div>
  );
}
