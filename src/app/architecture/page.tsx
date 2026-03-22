'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, Brain, Database, BarChart3, Code,
  Zap, Target, Layers, GitBranch, Cpu,
  Download, ExternalLink, CheckCircle, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Code block component with syntax highlighting
function CodeBlock({ code, language = 'python' }: { code: string; language?: string }) {
  return (
    <div className="code-block overflow-x-auto">
      <pre className="text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Animated section wrapper
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

// Metric card
function MetricCard({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
  return (
    <Card className="card-base">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <a
            href="/data/wine_price_prediction_report.pdf"
            download
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm"
          >
            <Download className="w-4 h-4" />
            Full Report
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <Section>
          <Badge className="bg-accent-primary/10 text-accent-primary border-accent-primary/20 mb-4">
            Technical Deep Dive
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Architecture & Research
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            How we built a production-ready wine price prediction system combining
            ensemble ML methods, NLP feature extraction, and Vision Language Models.
          </p>
        </Section>

        {/* Key Metrics */}
        <Section delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <MetricCard value="66%" label="R² Score" icon={TrendingUp} />
            <MetricCard value="130k+" label="Training Samples" icon={Database} />
            <MetricCard value="45" label="Engineered Features" icon={Layers} />
            <MetricCard value="36%" label="Error Reduction" icon={Target} />
          </div>
        </Section>

        {/* Content */}
        <div className="space-y-12">
          {/* ML Overview */}
          <Section delay={0.2}>
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Brain className="w-6 h-6 text-accent-primary" />
                  Machine Learning Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-foreground leading-relaxed">
                  The core of WineValue is an ensemble machine learning model that predicts
                  fair market prices for wines based on their characteristics. The model was
                  trained on over 130,000 wine reviews from Wine Enthusiast magazine, combining
                  structured features (variety, region, ratings) with unstructured text data
                  from professional tasting notes.
                </p>
                
                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Ensemble Architecture</h3>
                <p className="text-foreground leading-relaxed">
                  We implemented a stacked ensemble combining three gradient boosting frameworks:
                </p>
                
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 rounded-xl bg-background-tertiary border border-border">
                    <p className="font-semibold text-accent-primary">CatBoost</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Handles categorical features natively, reducing preprocessing complexity
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background-tertiary border border-border">
                    <p className="font-semibold text-accent-primary">XGBoost</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Strong performance on structured data with built-in regularization
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-background-tertiary border border-border">
                    <p className="font-semibold text-accent-primary">LightGBM</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fast training with leaf-wise growth, excellent for large datasets
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* Feature Engineering */}
          <Section delay={0.3}>
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Layers className="w-6 h-6 text-accent-primary" />
                  Feature Engineering Deep Dive
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-foreground leading-relaxed">
                  Feature engineering was critical to achieving strong predictive performance.
                  We developed 45 engineered features across four categories:
                </p>

                <div className="space-y-6 mt-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-amber-500/10 text-amber-400">TF-IDF NLP Features</Badge>
                      <span className="text-sm text-muted-foreground">15 features</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Extracted from tasting notes using TF-IDF vectorization with trigrams.
                      Identified quality indicators like "complex," "elegant," "balanced" that
                      correlate with higher prices.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-emerald-500/10 text-emerald-400">Target Encoding</Badge>
                      <span className="text-sm text-muted-foreground">12 features</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Encoded high-cardinality categorical variables (variety, region, winery)
                      using target encoding with smoothing to prevent overfitting.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-500/10 text-blue-400">Interaction Features</Badge>
                      <span className="text-sm text-muted-foreground">10 features</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created interaction terms between key variables (variety × region,
                      points × designation) to capture price synergies.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-500/10 text-purple-400">Original Features</Badge>
                      <span className="text-sm text-muted-foreground">8 features</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Points/rating, country, province, region, variety, designation, winery,
                      and price per liter calculations.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Sample Code</h3>
                <CodeBlock
                  code={`# TF-IDF Feature Extraction
from sklearn.feature_extraction.text import TfidfVectorizer

tfidf = TfidfVectorizer(
    max_features=500,
    ngram_range=(1, 3),
    stop_words='english'
)

# Extract features from tasting notes
tfidf_features = tfidf.fit_transform(wines['description'])

# Target encoding with smoothing
def target_encode(df, col, target, weight=10):
    means = df.groupby(col)[target].mean()
    counts = df.groupby(col)[target].count()
    global_mean = df[target].mean()
    
    smoothed = (counts * means + weight * global_mean) / (counts + weight)
    return df[col].map(smoothed)`}
                />
              </CardContent>
            </Card>
          </Section>

          {/* VLM Integration */}
          <Section delay={0.4}>
            <Card className="card-elevated border-accent-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Cpu className="w-6 h-6 text-accent-primary" />
                  VLM Integration for Label Scanning
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-foreground leading-relaxed">
                  A key innovation in WineValue is the integration of Vision Language Models
                  (VLMs) for automated label scanning. This allows users to simply photograph
                  a wine label and get instant price analysis, eliminating manual data entry.
                </p>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">How It Works</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-primary">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Image Capture</p>
                      <p className="text-sm text-muted-foreground">
                        User uploads or captures a photo of the wine label
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-primary">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">VLM Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Vision model extracts winery name, variety, region, vintage, and any visible ratings
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-primary">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Data Validation</p>
                      <p className="text-sm text-muted-foreground">
                        Fuzzy matching against our database of known varieties and regions
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-primary">4</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Price Prediction</p>
                      <p className="text-sm text-muted-foreground">
                        ML model generates fair value estimate with confidence interval
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-accent-primary">5</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Live Price Check</p>
                      <p className="text-sm text-muted-foreground">
                        Web search integration finds current retail prices for comparison
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">API Integration</h3>
                <CodeBlock
                  language="typescript"
                  code={`// VLM Label Analysis (Next.js API Route)
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${process.env.OPENAI_API_KEY}\`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: WINE_EXTRACTION_PROMPT },
        { type: 'image_url', image_url: { url: image } }
      ]
    }]
  }),
});
  
  // Parse structured wine data from VLM response
  const wineData = parseWineFromVLM(response);
  return NextResponse.json({ wine: wineData });
}`}
                />
              </CardContent>
            </Card>
          </Section>

          {/* Business Value */}
          <Section delay={0.5}>
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Zap className="w-6 h-6 text-accent-primary" />
                  Business Value & Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <p className="text-foreground leading-relaxed">
                  This project demonstrates several valuable business applications of ML
                  and VLM technology in the consumer wine market:
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
                    <h4 className="font-semibold text-foreground">Consumer Empowerment</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Helps consumers make informed purchasing decisions by providing
                      objective fair value estimates.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
                    <h4 className="font-semibold text-foreground">Price Transparency</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reduces information asymmetry in wine pricing, particularly
                      beneficial for less experienced buyers.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
                    <h4 className="font-semibold text-foreground">Value Discovery</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Identifies undervalued wines and regions, creating opportunities
                      for savvy consumers and retailers.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
                    <h4 className="font-semibold text-foreground">Retailer Intelligence</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provides competitive intelligence on pricing strategies and
                      market positioning.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Unique Differentiators</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                    <span className="text-foreground">
                      <strong>VLM-Powered UX:</strong> Unlike competitors, we use VLM to eliminate
                      manual data entry, making the tool accessible to casual users.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                    <span className="text-foreground">
                      <strong>Explainable Predictions:</strong> SHAP values provide transparency
                      into why a wine is priced the way it is.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                    <span className="text-foreground">
                      <strong>NLP from Tasting Notes:</strong> Extracts pricing signals from
                      professional reviews that other models miss.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2" />
                    <span className="text-foreground">
                      <strong>Live Price Integration:</strong> Cross-references predictions with
                      real-time retail data for accuracy validation.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </Section>

          {/* Technical Stack */}
          <Section delay={0.6}>
            <Card className="card-base">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <GitBranch className="w-6 h-6 text-accent-primary" />
                  Technical Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Frontend</h4>
                    <ul className="space-y-2">
                      {[
                        'Next.js 16 with App Router',
                        'TypeScript for type safety',
                        'Tailwind CSS for styling',
                        'Framer Motion for animations',
                        'shadcn/ui components',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Backend & ML</h4>
                    <ul className="space-y-2">
                      {[
                        'Next.js API Routes',
                        'CatBoost, XGBoost, LightGBM',
                        'scikit-learn for preprocessing',
                        'VLM via OpenAI GPT-4o-mini Vision',
                        'Web search for live prices',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          {/* CTA */}
          <Section delay={0.7}>
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Explore the Research
              </h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/data/wine_price_prediction_report.pdf" download>
                  <Button className="btn-primary">
                    <Download className="w-4 h-4 mr-2" />
                    Download Full Report
                  </Button>
                </a>
                <Link href="/insights">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Model Insights
                  </Button>
                </Link>
              </div>
            </div>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 mt-12 border-t border-border">
        <p className="text-sm text-muted-foreground mb-2">
          ML Wine Price Prediction • Research Portfolio Project
        </p>
        <p className="text-sm text-muted-foreground/60 italic">
          À votre santé — Apurva Desai
        </p>
      </footer>
    </div>
  );
}
