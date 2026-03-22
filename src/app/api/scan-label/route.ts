import { NextRequest, NextResponse } from 'next/server';

const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Cabernet Franc', 'Grenache', 'Mourvèdre', 'Prosecco',
  'Champagne', 'Gewürztraminer', 'Viognier', 'Pinot Gris', 'Petit Verdot',
];

const PROVINCE_MAP: Record<string, string> = {
  'US': 'California', 'France': 'Bordeaux', 'Italy': 'Tuscany', 'Spain': 'Rioja',
  'Argentina': 'Mendoza', 'Australia': 'South Australia', 'Germany': 'Mosel',
};

function findVariety(text: string): string {
  const lower = text.toLowerCase();
  for (const v of COMMON_VARIETIES) if (lower.includes(v.toLowerCase())) return v;
  return 'Red Blend';
}

const PROMPT = 'Extract wine info from this label. Return ONLY valid JSON, no markdown: {"winery":"","wine_name":"","variety":"","region":"","country":"","vintage":"","price":null,"tasting_notes":""}';

async function callZAI(image: string): Promise<string | null> {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'GLM-4.6V-Flash',
      messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: image } }] }],
      max_tokens: 500, thinking: { type: 'disabled' },
    }),
  });
  if (!res.ok) {
    console.error('Z.AI VLM:', res.status);
    return null;
  }
  return (await res.json()).choices?.[0]?.message?.content || null;
}

async function callGemini(image: string, geminiKey: string): Promise<string | null> {
  // Strip data URI prefix to get raw base64
  const base64 = image.replace(/^data:image\/\w+;base64,/, '');
  const mimeType = image.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg';

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }]
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('Gemini:', res.status, err.slice(0, 200));
    return null;
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function parseVLMResponse(content: string) {
  let extracted: any = {};
  try {
    const clean = content.replace(/```\w*\n?/g, '').trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) extracted = JSON.parse(m[0]);
  } catch {}

  let country = extracted.country || 'US';
  if (country.toLowerCase().includes('united states') || country.toLowerCase() === 'usa') country = 'US';

  const variety = extracted.variety ? findVariety(extracted.variety) : findVariety(content);
  const region = extracted.region || PROVINCE_MAP[country] || 'Unknown';
  const winery = extracted.winery || 'Unknown';
  const wineName = extracted.wine_name || `${winery} ${variety}`.trim();

  return {
    name: wineName, variety, region, country,
    province: PROVINCE_MAP[country] || region,
    vintage: extracted.vintage || 'NV', winery,
    rating: extracted.rating || 4.0,
    tasting_notes: extracted.tasting_notes || `${variety} from ${region}`,
    predicted_price: 0,
    listed_price: typeof extracted.price === 'number' ? extracted.price : null,
    confidence: extracted.wine_name ? 'high' : 'medium',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = body.image;
    const geminiKey = body.gemini_key; // Optional user-provided Gemini key

    if (!image) return NextResponse.json({ success: false, error: 'No image provided' });

    console.log('Label scan: image size', Math.round(image.length / 1024), 'KB');

    // Try Z.AI free vision first
    let content = await callZAI(image);

    // If Z.AI fails, try Gemini if user provided a key
    if (!content && geminiKey) {
      console.log('Z.AI unavailable, trying Gemini...');
      content = await callGemini(image, geminiKey);
    }

    // If Z.AI fails and no Gemini key, check server-side Gemini key
    if (!content && !geminiKey && process.env.GEMINI_API_KEY) {
      console.log('Z.AI unavailable, trying server Gemini key...');
      content = await callGemini(image, process.env.GEMINI_API_KEY);
    }

    if (!content) {
      return NextResponse.json({
        success: false,
        error: 'The free vision model is at capacity. You can add a free Google Gemini API key in settings for unlimited label scanning, or enter the wine name manually.',
        needsGeminiKey: true,
      });
    }

    console.log('VLM content:', content.slice(0, 200));
    return NextResponse.json({ success: true, wine: parseVLMResponse(content) });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to analyze label. Try entering the wine name manually.' });
  }
}
