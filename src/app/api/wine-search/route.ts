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

async function searchWithZAI(query: string): Promise<WineSearchResult[]> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) throw new Error('ZAI_API_KEY not set');

  // Use Z.AI's GLM-4.7-Flash (free) with web search tool
  const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'GLM-4.7-Flash',
      messages: [{
        role: 'user',
        content: `Search for wine prices for: "${query}". Find real current retail prices from wine retailers. Return ONLY a JSON array of results, no other text. Each result: {"name":"full wine name","merchant":"retailer name","price":29.99,"url":"product url","rating":4.2,"region":"wine region"}. Return at least 3 results if possible.`
      }],
      tools: [{
        type: 'web_search',
        web_search: {
          enable: 'True',
          search_result: 'True',
          search_engine: 'search-prime',
          count: '10',
        }
      }],
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Z.AI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON array from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.filter((r: any) => r.name).map((r: any) => ({
      name: r.name || '',
      merchant: r.merchant || 'Online',
      price: typeof r.price === 'number' ? r.price : parseFloat(r.price) || 0,
      url: r.url || '',
      rating: r.rating || undefined,
      vintage: r.vintage || undefined,
      region: r.region || undefined,
    })).slice(0, 8);
  } catch {
    return [];
  }
}

// Fallback: Vivino API (works from non-cloud IPs)
async function searchVivino(query: string): Promise<WineSearchResult[]> {
  const url = `https://www.vivino.com/api/explore/explore?country_code=US&currency_code=USD&min_rating=1&order_by=relevance&order=desc&page=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.explore_vintage?.matches || []).slice(0, 8).map((m: any) => {
    const v = m.vintage || {};
    const w = v.wine || {};
    const winery = w.winery || {};
    const region = w.region || {};
    const price = m.price || {};
    const img = v.image?.variations?.bottle_medium || v.image?.location;
    return {
      name: `${winery.name || ''} ${w.name || v.name || ''}`.trim(),
      merchant: 'Vivino',
      price: price.amount || 0,
      url: `https://www.vivino.com/w/${w.id || ''}`,
      rating: v.statistics?.ratings_average || undefined,
      vintage: v.year?.toString() || undefined,
      region: region.name || undefined,
      image: img ? (img.startsWith('http') ? img : `https:${img}`) : undefined,
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
      { success: false, error: 'Provide wine name or variety', results: [], query: '', sources: [], timestamp: new Date().toISOString() },
      { status: 400 }
    );
  }

  const query = [wineName, vintage, variety, region].filter(Boolean).join(' ');

  try {
    // Try Z.AI web search first (works from cloud IPs)
    let results = await searchWithZAI(query);
    let sources = ['Web Search'];

    // Fallback to Vivino if Z.AI returns nothing
    if (results.length === 0) {
      results = await searchVivino(query);
      sources = ['Vivino'];
    }

    return NextResponse.json({
      success: true, query, results, sources,
      timestamp: new Date().toISOString(),
    } as WineSearchResponse);
  } catch (error: any) {
    console.error('Wine search error:', error.message);
    // Last resort fallback
    return NextResponse.json({
      success: true, query,
      results: [{ name: query, merchant: 'Vivino', price: 0, url: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`, region: 'Search on Vivino' }],
      sources: ['Vivino (direct link)'],
      timestamp: new Date().toISOString(),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country].filter(Boolean).join(' ');
    let results = await searchWithZAI(query);
    if (results.length === 0) results = await searchVivino(query);
    return NextResponse.json({
      success: true, query, results,
      sources: results[0]?.merchant === 'Vivino' ? ['Vivino'] : ['Web Search'],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Wine search POST error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Search failed. Try again.', query: '', results: [], sources: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
