import { NextRequest, NextResponse } from 'next/server';

export interface WineSearchResult {
  name: string;
  merchant: string;
  price: number;
  url: string;
  rating?: number;
  vintage?: string;
  region?: string;
}

export interface WineSearchResponse {
  success: boolean;
  query: string;
  results: WineSearchResult[];
  sources: string[];
  timestamp: string;
  error?: string;
}

async function scrapeWineSearcher(query: string): Promise<WineSearchResult[]> {
  const url = `https://www.wine-searcher.com/find/${encodeURIComponent(query)}/1/usa`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) return [];
  const html = await res.text();
  const results: WineSearchResult[] = [];

  // Parse wine listings from HTML
  // Wine-Searcher uses structured data we can extract with regex
  const pricePattern = /class="price"[^>]*>\s*\$\s*([\d,.]+)/gi;
  const namePattern = /class="wine-name[^"]*"[^>]*>([^<]+)/gi;
  const merchantPattern = /class="merchant[^"]*"[^>]*>([^<]+)/gi;

  // Simpler: extract all price+name pairs from the page
  const listingPattern = /<a[^>]*href="(\/merchant\/[^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?\$([\d,.]+)/gi;
  let match;
  while ((match = listingPattern.exec(html)) !== null && results.length < 8) {
    results.push({
      name: match[2].trim(),
      merchant: match[2].trim(),
      price: parseFloat(match[3].replace(',', '')),
      url: `https://www.wine-searcher.com${match[1]}`,
    });
  }

  // Fallback: extract any price mentions with surrounding context
  if (results.length === 0) {
    const priceBlocks = html.match(/[^<]{0,100}\$\d+(?:\.\d{2})?[^<]{0,100}/g) || [];
    for (const block of priceBlocks.slice(0, 8)) {
      const p = block.match(/\$([\d,.]+)/);
      if (p) {
        const price = parseFloat(p[1].replace(',', ''));
        if (price >= 5 && price <= 5000) {
          results.push({
            name: block.replace(/<[^>]*>/g, '').trim().slice(0, 80),
            merchant: 'Wine-Searcher',
            price,
            url: `https://www.wine-searcher.com/find/${encodeURIComponent(query)}`,
          });
        }
      }
    }
  }

  return results;
}

async function scrapeVivino(query: string): Promise<WineSearchResult[]> {
  try {
    const url = `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: WineSearchResult[] = [];

    const priceMatches = html.match(/\$([\d,.]+)/g) || [];
    const ratingMatches = html.match(/([\d.]+)\s*<\/span>\s*<span[^>]*>[\d,]+ ratings/gi) || [];

    for (let i = 0; i < Math.min(priceMatches.length, 5); i++) {
      const price = parseFloat(priceMatches[i].replace('$', '').replace(',', ''));
      if (price >= 5 && price <= 5000) {
        results.push({
          name: query,
          merchant: 'Vivino',
          price,
          url: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wineName = searchParams.get('name');
  const variety = searchParams.get('variety');
  const vintage = searchParams.get('vintage');
  const region = searchParams.get('region');

  if (!wineName && !variety) {
    return NextResponse.json(
      { success: false, error: 'Please provide wine name or variety', results: [], query: '', sources: [], timestamp: new Date().toISOString() },
      { status: 400 }
    );
  }

  const query = [wineName, vintage, variety, region].filter(Boolean).join(' ');

  try {
    const [wsResults, vivinoResults] = await Promise.allSettled([
      scrapeWineSearcher(query),
      scrapeVivino(query),
    ]);

    const allResults = [
      ...(wsResults.status === 'fulfilled' ? wsResults.value : []),
      ...(vivinoResults.status === 'fulfilled' ? vivinoResults.value : []),
    ].sort((a, b) => {
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;
      return (a.price || 0) - (b.price || 0);
    }).slice(0, 8);

    const sources = [...new Set(allResults.map(r => r.merchant))];

    return NextResponse.json({
      success: true,
      query,
      results: allResults,
      sources,
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search for wine prices. Try again.', query, results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country].filter(Boolean).join(' ');

    const [wsResults, vivinoResults] = await Promise.allSettled([
      scrapeWineSearcher(query),
      scrapeVivino(query),
    ]);

    const allResults = [
      ...(wsResults.status === 'fulfilled' ? wsResults.value : []),
      ...(vivinoResults.status === 'fulfilled' ? vivinoResults.value : []),
    ].sort((a, b) => (a.price || 0) - (b.price || 0)).slice(0, 10);

    return NextResponse.json({
      success: true,
      query,
      results: allResults,
      sources: [...new Set(allResults.map(r => r.merchant))],
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search.', query: '', results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
