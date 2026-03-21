'use client';

import Link from 'next/link';
import { Wine, Github, ExternalLink, Download } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/50 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">WineValue</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs">
              ML-powered wine price prediction. Scan any label to discover if you're getting a fair deal.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Navigation</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-sm text-slate-400 hover:text-amber-400 transition-colors">
                Wine Scanner
              </Link>
              <Link href="/insights" className="text-sm text-slate-400 hover:text-amber-400 transition-colors">
                Model Insights
              </Link>
              <Link href="/architecture" className="text-sm text-slate-400 hover:text-amber-400 transition-colors">
                Architecture Blog
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Resources</h3>
            <nav className="flex flex-col gap-2">
              <a
                href="/data/wine_price_prediction_report.pdf"
                download
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Github className="w-3.5 h-3.5" />
                View Source
                <ExternalLink className="w-3 h-3" />
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Powered by ML • Trained on 130,000+ wine reviews
          </p>
          <p className="text-xs text-slate-500">
            Built with Next.js, CatBoost, XGBoost & LightGBM
          </p>
        </div>
      </div>
    </footer>
  );
}
