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

async function searchVivino(query: string): Promise<WineSearchResult[]> {
  const url = `https://www.vivino.com/api/explore/explore?country_code=US&currency_code=USD&min_rating=1&order_by=ratings_count&order=desc&page=1&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) throw new Error(`Vivino API returned ${res.status}`);
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
      image: img ? `https:${img}` : undefined,
    };
  }).filter((r: WineSearchResult) => r.name);
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
    const results = await searchVivino(query);
    return NextResponse.json({
      success: true,
      query,
      results,
      sources: ['Vivino'],
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to search. Try again.', query, results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country].filter(Boolean).join(' ');
    const results = await searchVivino(query);

    return NextResponse.json({
      success: true,
      query,
      results,
      sources: ['Vivino'],
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search POST error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to search.', query: '', results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
