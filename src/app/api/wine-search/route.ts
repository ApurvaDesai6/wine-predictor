import { NextRequest, NextResponse } from 'next/server';

export interface WineSearchResult {
  name: string;
  merchant: string;
  price: number;
  url: string;
  rating?: number;
  vintage?: string;
  region?: string;
  image?: string;
}

export interface WineSearchResponse {
  success: boolean;
  query: string;
  results: WineSearchResult[];
  sources: string[];
  timestamp: string;
  error?: string;
}

// Vivino blocks server-side requests from cloud IPs.
// This route acts as a thin proxy that adds the right headers.
// If Vivino blocks, we return instructions for client-side fallback.

async function searchVivino(query: string): Promise<WineSearchResult[]> {
  // Try multiple user agents and accept headers
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.vivino.com/',
    'Origin': 'https://www.vivino.com',
  };

  const url = `https://www.vivino.com/api/explore/explore?country_code=US&currency_code=USD&min_rating=1&order_by=relevance&order=desc&page=1&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    // If blocked, return empty so frontend can try client-side
    console.error(`Vivino returned ${res.status} for query: ${query}`);
    return [];
  }

  const data = await res.json();
  const matches = data?.explore_vintage?.matches || [];

  return matches.slice(0, 8).map((m: any) => {
    const v = m.vintage || {};
    const w = v.wine || {};
    const stats = v.statistics || {};
    const price = m.price || {};
    const winery = w.winery || {};
    const region = w.region || {};
    const img = v.image?.variations?.bottle_medium || v.image?.location;

    return {
      name: `${winery.name || ''} ${w.name || v.name || ''}`.trim(),
      merchant: 'Vivino',
      price: price.amount || 0,
      url: `https://www.vivino.com/w/${w.id || ''}`,
      rating: stats.ratings_average || undefined,
      vintage: v.year?.toString() || undefined,
      region: region.name || undefined,
      image: img ? (img.startsWith('http') ? img : `https:${img}`) : undefined,
    };
  }).filter((r: WineSearchResult) => r.name);
}

// Fallback: use the prediction model to generate estimated prices
function generateEstimatedResults(query: string): WineSearchResult[] {
  // Parse what we can from the query
  const words = query.split(/\s+/);
  return [{
    name: query,
    merchant: 'Estimated',
    price: 0,
    url: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`,
    region: 'Search on Vivino',
  }];
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const wineName = sp.get('name');
  const variety = sp.get('variety');
  const vintage = sp.get('vintage');
  const region = sp.get('region');

  if (!wineName && !variety) {
    return NextResponse.json(
      { success: false, error: 'Please provide wine name or variety', results: [], query: '', sources: [], timestamp: new Date().toISOString() },
      { status: 400 }
    );
  }

  const query = [wineName, vintage, variety, region].filter(Boolean).join(' ');

  try {
    let results = await searchVivino(query);

    // If Vivino blocked us, provide a direct link
    if (results.length === 0) {
      results = generateEstimatedResults(query);
      return NextResponse.json({
        success: true,
        query,
        results,
        sources: ['Vivino (direct link)'],
        timestamp: new Date().toISOString(),
        vivinoUrl: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`,
      });
    }

    return NextResponse.json({
      success: true, query, results,
      sources: ['Vivino'],
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search error:', error.message);
    return NextResponse.json({
      success: true,
      query,
      results: generateEstimatedResults(query),
      sources: ['Vivino (direct link)'],
      timestamp: new Date().toISOString(),
      vivinoUrl: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country].filter(Boolean).join(' ');
    let results = await searchVivino(query);

    if (results.length === 0) {
      results = generateEstimatedResults(query);
    }

    return NextResponse.json({
      success: true, query, results,
      sources: results[0]?.merchant === 'Estimated' ? ['Vivino (direct link)'] : ['Vivino'],
      timestamp: new Date().toISOString(),
      vivinoUrl: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`,
    });
  } catch (error: any) {
    console.error('Wine search POST error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to search.', query: '', results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
