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

async function searchWithGoogle(query: string): Promise<WineSearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    throw new Error('Google Search API not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX.');
  }

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Search API error: ${res.status}`);
  const data = await res.json();

  const results: WineSearchResult[] = [];
  const items = data.items || [];

  for (const item of items) {
    const hostname = new URL(item.link).hostname;
    let merchant = hostname.replace('www.', '').split('.')[0];
    merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);

    if (hostname.includes('wine-searcher')) merchant = 'Wine-Searcher';
    else if (hostname.includes('vivino')) merchant = 'Vivino';
    else if (hostname.includes('wine.com')) merchant = 'Wine.com';
    else if (hostname.includes('totalwine')) merchant = 'Total Wine';

    const snippet = item.snippet || '';
    const priceMatch = snippet.match(/\$(\d+(?:\.\d{2})?)/);
    const ratingMatch = snippet.match(/(\d(?:\.\d)?)\s*(?:\/5|stars?)/i);
    const vintageMatch = snippet.match(/\b(19[9]\d|20[0-2]\d)\b/);

    results.push({
      name: item.title || '',
      merchant,
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      url: item.link,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
      vintage: vintageMatch ? vintageMatch[1] : undefined,
    });
  }

  return results.sort((a, b) => {
    if (a.price && !b.price) return -1;
    if (!a.price && b.price) return 1;
    return (a.price || 0) - (b.price || 0);
  }).slice(0, 8);
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

  const query = [wineName, vintage, variety, region, 'wine price buy'].filter(Boolean).join(' ');

  try {
    const results = await searchWithGoogle(query);
    const sources = [...new Set(results.map(r => r.merchant))];

    return NextResponse.json({
      success: true,
      query,
      results,
      sources,
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search for wine prices.', query, results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country, 'wine price buy online'].filter(Boolean).join(' ');
    const results = await searchWithGoogle(query);
    const sources = [...new Set(results.map(r => r.merchant))];

    return NextResponse.json({
      success: true,
      query,
      results,
      sources,
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search for wine prices', query: '', results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
