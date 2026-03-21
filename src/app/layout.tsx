import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wine Price Prediction Engine | ML Portfolio Project",
  description: "Machine learning powered wine price prediction using ensemble methods, NLP feature extraction, and advanced hyperparameter optimization. Built with Next.js, CatBoost, XGBoost, and LightGBM.",
  keywords: ["Wine", "Machine Learning", "Price Prediction", "XGBoost", "LightGBM", "CatBoost", "NLP", "BERT", "Next.js", "Portfolio"],
  authors: [{ name: "Wine ML Project" }],
  icons: {
    icon: "/wine-icon.svg",
  },
  openGraph: {
    title: "Wine Price Prediction Engine",
    description: "ML-powered wine price prediction with ensemble methods and NLP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wine Price Prediction Engine",
    description: "ML-powered wine price prediction with ensemble methods and NLP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
