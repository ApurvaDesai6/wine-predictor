import { NextRequest, NextResponse } from 'next/server';

const PROVINCE_MAP: Record<string, string> = {
  'US': 'California', 'France': 'Bordeaux', 'Italy': 'Tuscany', 'Spain': 'Rioja',
  'Argentina': 'Mendoza', 'New Zealand': 'Marlborough', 'Germany': 'Mosel',
  'Australia': 'South Australia', 'Chile': 'Central Valley', 'Portugal': 'Douro',
};

const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Cabernet Franc', 'Grenache', 'Mourvèdre', 'Prosecco',
  'Champagne', 'Gewürztraminer', 'Viognier', 'Pinot Gris', 'Petit Verdot',
];

function findVariety(text: string): string {
  const lower = text.toLowerCase();
  for (const v of COMMON_VARIETIES) {
    if (lower.includes(v.toLowerCase())) return v;
  }
  return 'Red Blend';
}

function findCountry(text: string): string {
  const lower = text.toLowerCase();
  const map: Record<string, string[]> = {
    'US': ['napa', 'sonoma', 'california', 'oregon', 'usa', 'united states'],
    'France': ['bordeaux', 'burgundy', 'champagne', 'france', 'chateau', 'château', 'domaine'],
    'Italy': ['tuscany', 'toscana', 'chianti', 'barolo', 'italy', 'tenuta', 'brunello'],
    'Spain': ['rioja', 'spain', 'ribera', 'bodega'],
    'Argentina': ['mendoza', 'argentina'],
    'Australia': ['barossa', 'australia'],
  };
  for (const [country, kws] of Object.entries(map)) {
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

function findPrice(text: string): number | null {
  const m = text.match(/\$\s*(\d{1,4}(?:\.\d{2})?)/);
  if (m) {
    const p = parseFloat(m[1]);
    if (p >= 5 && p <= 5000) return p;
  }
  return null;
}

async function analyzeWithVLM(imageDataUrl: string) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'GLM-4.6V-Flash',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'You are a wine expert. Extract info from this wine label and return ONLY valid JSON: {"winery":"...","wine_name":"...","variety":"...","region":"...","country":"...","vintage":"...","price":null,"tasting_notes":"...","all_text":"all visible text"}'
          },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }],
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    console.error('VLM error:', res.status, await res.text().catch(() => ''));
    return null;
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const jsonMatch = text.replace(/```\w*\n?/g, '').match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try { return JSON.parse(jsonMatch[0]); }
  catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = body.image;
    const ocrText = body.ocr_text || body.text || '';

    if (!image && !ocrText) {
      return NextResponse.json({ success: false, error: 'No image or text provided' }, { status: 400 });
    }

    let extracted: any = null;

    // Try VLM if we have an image and API key
    if (image && process.env.ZAI_API_KEY) {
      extracted = await analyzeWithVLM(image);
    }

    // Build wine data from VLM result or fallback to text parsing
    const allText = extracted?.all_text || ocrText || '';
    const country = extracted?.country
      ? (extracted.country.toLowerCase().includes('united states') ? 'US' : extracted.country)
      : findCountry(allText);
    const variety = extracted?.variety ? findVariety(extracted.variety + ' ' + allText) : findVariety(allText);
    const vintage = extracted?.vintage || findVintage(allText);
    const winery = extracted?.winery || 'Unknown Winery';
    const listedPrice = extracted?.price || findPrice(allText);
    const region = extracted?.region || PROVINCE_MAP[country] || 'Unknown';
    const wineName = extracted?.wine_name || `${winery} ${variety} ${vintage !== 'NV' ? vintage : ''}`.trim();

    return NextResponse.json({
      success: true,
      wine: {
        name: wineName,
        variety,
        region,
        country,
        province: PROVINCE_MAP[country] || region,
        vintage,
        winery,
        rating: 4.0,
        tasting_notes: extracted?.tasting_notes || `Detected: ${variety} from ${region}, ${country}`,
        predicted_price: 0,
        listed_price: listedPrice,
        confidence: extracted ? 'high' : 'low',
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze label. Try entering the wine name manually.',
    }, { status: 500 });
  }
}
