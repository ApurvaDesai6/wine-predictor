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
        content: `Search for current retail prices for: "${query}". Return ONLY a JSON array, no other text: [{"name":"full wine name","merchant":"retailer","price":29.99,"url":"product url","rating":4.2,"region":"region"}]`
      }],
      tools: [{
        type: 'web_search',
        web_search: { enable: 'True', search_result: 'True', search_engine: 'search-prime', count: '10' }
      }],
      max_tokens: 1000,
      thinking: { type: 'disabled' },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('Z.AI search error:', res.status, err.slice(0, 200));
    throw new Error(`Z.AI API error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  console.log('Z.AI search content:', content.slice(0, 300));

  const jsonMatch = content.replace(/```\w*\n?/g, '').match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]).filter((r: any) => r.name).map((r: any) => ({
        name: r.name || '', merchant: r.merchant || 'Online',
        price: parseFloat(r.price) || 0, url: r.url || '',
        rating: r.rating || undefined, region: r.region || undefined,
      })).slice(0, 8);
    } catch {}
  }

  const webResults = data.web_search || [];
  if (webResults.length > 0) {
    return webResults.slice(0, 8).map((r: any) => {
      const pm = (r.content || '').match(/\$(\d+(?:\.\d{2})?)/);
      return { name: r.title || '', merchant: r.media || 'Web', price: pm ? parseFloat(pm[1]) : 0, url: r.link || '' };
    }).filter((r: WineSearchResult) => r.price > 0);
  }

  return [];
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const wineName = sp.get('name');
  const variety = sp.get('variety');
  if (!wineName && !variety) {
    return NextResponse.json({ success: false, error: 'Provide wine name or variety', results: [], query: '', sources: [], timestamp: new Date().toISOString() }, { status: 400 });
  }
  const query = [wineName, sp.get('vintage'), variety, sp.get('region')].filter(Boolean).join(' ');
  try {
    const results = await searchWithZAI(query);
    return NextResponse.json({ success: true, query, results, sources: ['Web Search'], timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Wine search error:', error.message);
    return NextResponse.json({ success: true, query, results: [{ name: query, merchant: 'Vivino', price: 0, url: `https://www.vivino.com/search/wines?q=${encodeURIComponent(query)}`, region: 'Search on Vivino' }], sources: ['Vivino (direct link)'], timestamp: new Date().toISOString() });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, winery, variety, vintage, region, country } = await request.json();
    const query = [name || winery, vintage, variety, region, country].filter(Boolean).join(' ');
    const results = await searchWithZAI(query);
    return NextResponse.json({ success: true, query, results, sources: ['Web Search'], timestamp: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Search failed.', query: '', results: [], sources: [], timestamp: new Date().toISOString() }, { status: 200 });
  }
}
