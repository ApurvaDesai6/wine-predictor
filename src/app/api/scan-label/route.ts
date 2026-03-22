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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image = body.image;

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Vision API not configured' }, { status: 500 });
    }

    // Call Z.AI GLM-4.6V-Flash (free vision model)
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
              text: 'You are a wine expert analyzing a wine label image. Extract ALL visible information and return ONLY a valid JSON object (no markdown, no explanation). Fields: {"winery":"...","wine_name":"...","variety":"...","region":"...","country":"...","vintage":"...","rating":null,"price":null,"tasting_notes":"...","all_text":"all visible text from label"}'
            },
            { type: 'image_url', image_url: { url: image } }
          ]
        }],
        max_tokens: 800,
        thinking: { type: 'disabled' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('VLM error:', res.status, errText.slice(0, 200));
      return NextResponse.json({ success: false, error: 'Failed to analyze label. Try a clearer photo.' }, { status: 500 });
    }

    const data = await res.json();
    const analysisText = data.choices?.[0]?.message?.content || '';
    console.log('VLM response:', analysisText.slice(0, 300));

    // Parse JSON from response
    let extracted: any = {};
    try {
      const clean = analysisText.replace(/```\w*\n?/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch {
      extracted = { all_text: analysisText };
    }

    const allText = extracted.all_text || analysisText;
    let country = extracted.country || 'US';
    if (country.toLowerCase().includes('united states') || country.toLowerCase() === 'usa') country = 'US';

    const variety = extracted.variety ? findVariety(extracted.variety + ' ' + allText) : findVariety(allText);
    const region = extracted.region || PROVINCE_MAP[country] || 'Unknown';
    const vintage = extracted.vintage || 'NV';
    const winery = extracted.winery || 'Unknown Winery';
    const wineName = extracted.wine_name || `${winery} ${variety} ${vintage !== 'NV' ? vintage : ''}`.trim();
    const listedPrice = typeof extracted.price === 'number' ? extracted.price : null;

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
        rating: extracted.rating || 4.0,
        tasting_notes: extracted.tasting_notes || `Detected: ${variety} from ${region}, ${country}`,
        predicted_price: 0,
        listed_price: listedPrice,
        confidence: extracted.wine_name ? 'high' : 'medium',
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze wine label. Try again or enter details manually.',
    }, { status: 500 });
  }
}
