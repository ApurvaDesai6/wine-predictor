import { NextRequest, NextResponse } from 'next/server';

const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Cabernet Franc', 'Grenache', 'Mourvèdre', 'Prosecco',
  'Champagne', 'Gewürztraminer', 'Viognier', 'Pinot Gris', 'Petit Verdot',
];

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'US': ['napa', 'sonoma', 'california', 'oregon', 'paso robles', 'usa', 'washington'],
  'France': ['bordeaux', 'burgundy', 'bourgogne', 'rhone', 'champagne', 'france', 'chateau', 'château', 'domaine'],
  'Italy': ['tuscany', 'toscana', 'chianti', 'barolo', 'italy', 'tenuta', 'brunello'],
  'Spain': ['rioja', 'spain', 'ribera', 'tempranillo', 'bodega'],
  'Argentina': ['mendoza', 'argentina', 'malbec'],
  'Australia': ['barossa', 'australia', 'shiraz'],
  'New Zealand': ['marlborough', 'new zealand'],
  'Germany': ['mosel', 'germany', 'riesling'],
};

const PROVINCE_MAP: Record<string, string> = {
  'US': 'California', 'France': 'Bordeaux', 'Italy': 'Tuscany', 'Spain': 'Rioja',
  'Argentina': 'Mendoza', 'Australia': 'South Australia', 'Germany': 'Mosel',
};

function findVariety(text: string): string {
  const lower = text.toLowerCase();
  for (const v of COMMON_VARIETIES) {
    if (lower.includes(v.toLowerCase())) return v;
  }
  return 'Red Blend';
}

function findCountry(text: string): string {
  const lower = text.toLowerCase();
  for (const [country, kws] of Object.entries(COUNTRY_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return country;
  }
  return 'US';
}

function findVintage(text: string): string {
  const m = text.match(/\b(19[89]\d|20[0-2]\d)\b/g);
  if (m) {
    const years = m.map(Number).filter(y => y >= 1980 && y <= new Date().getFullYear());
    if (years.length) return Math.max(...years).toString();
  }
  return 'NV';
}

// Search Vivino to identify the wine from the image
async function identifyViaVivino(query: string) {
  const url = `https://www.vivino.com/api/explore/explore?country_code=US&currency_code=USD&min_rating=1&order_by=ratings_count&order=desc&page=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const match = data?.explore_vintage?.matches?.[0];
  if (!match) return null;

  const v = match.vintage || {};
  const w = v.wine || {};
  const winery = w.winery || {};
  const region = w.region || {};
  const price = match.price || {};
  const stats = v.statistics || {};

  return {
    name: `${winery.name || ''} ${w.name || v.name || ''}`.trim(),
    variety: w.name || 'Red Blend',
    region: region.name || 'Unknown',
    country: region.country?.name || 'US',
    province: region.name || 'Unknown',
    vintage: v.year?.toString() || 'NV',
    winery: winery.name || 'Unknown',
    rating: stats.ratings_average || 4.0,
    tasting_notes: `${stats.ratings_count || 0} ratings on Vivino`,
    predicted_price: 0,
    listed_price: price.amount || null,
    confidence: price.amount ? 'high' : 'medium',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept either OCR text (from client-side) or a search query
    const ocrText = body.ocr_text || body.text || '';
    const searchQuery = body.query || '';

    if (!ocrText && !searchQuery) {
      return NextResponse.json({ success: false, error: 'No text or query provided' }, { status: 400 });
    }

    const query = searchQuery || ocrText;

    // Try to identify via Vivino first
    const vivinoResult = await identifyViaVivino(query);
    if (vivinoResult) {
      return NextResponse.json({ success: true, wine: vivinoResult });
    }

    // Fallback: parse from OCR text
    const country = findCountry(query);
    const variety = findVariety(query);
    const vintage = findVintage(query);
    const province = PROVINCE_MAP[country] || 'Unknown';

    return NextResponse.json({
      success: true,
      wine: {
        name: query.slice(0, 80),
        variety,
        region: province,
        country,
        province,
        vintage,
        winery: query.split(/\s+/).slice(0, 2).join(' '),
        rating: 4.0,
        tasting_notes: `Detected: ${variety} from ${country}`,
        predicted_price: 0,
        listed_price: null,
        confidence: 'low',
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze. Try entering the wine name manually.',
    }, { status: 500 });
  }
}
