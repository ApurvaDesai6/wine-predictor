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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = body.image;
    if (!image) return NextResponse.json({ success: false, error: 'No image provided' });

    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: 'Vision API not configured' });

    console.log('Label scan: image size', Math.round(image.length / 1024), 'KB');

    const res = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'GLM-4.6V-Flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extract wine info from this label. Return ONLY valid JSON, no markdown: {"winery":"","wine_name":"","variety":"","region":"","country":"","vintage":"","price":null,"tasting_notes":""}' },
            { type: 'image_url', image_url: { url: image } }
          ]
        }],
        max_tokens: 500,
        thinking: { type: 'disabled' },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('VLM error:', res.status, err.slice(0, 200));
      const errObj = JSON.parse(err).error || {};
      const isOverloaded = errObj.code === '1305' || res.status === 429;
      return NextResponse.json({
        success: false,
        error: isOverloaded
          ? 'The free vision model is temporarily at capacity. Try again in 30 seconds, or enter the wine name manually below.'
          : `Vision API error. Try entering the wine name manually.`
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('VLM content:', content.slice(0, 300));

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

    return NextResponse.json({
      success: true,
      wine: {
        name: wineName, variety, region, country,
        province: PROVINCE_MAP[country] || region,
        vintage: extracted.vintage || 'NV', winery,
        rating: extracted.rating || 4.0,
        tasting_notes: extracted.tasting_notes || `${variety} from ${region}`,
        predicted_price: 0,
        listed_price: typeof extracted.price === 'number' ? extracted.price : null,
        confidence: extracted.wine_name ? 'high' : 'medium',
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to analyze label. Try again or enter details manually.' });
  }
}
