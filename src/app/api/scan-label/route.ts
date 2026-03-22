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

    // Z.AI vision API accepts both URLs and base64 data URIs
    // For large images, we need to ensure the base64 is properly formatted
    let imageUrl = image;

    // If it's a data URI, ensure it's valid
    if (image.startsWith('data:')) {
      // Check size - Z.AI may have limits on inline base64
      const base64Part = image.split(',')[1] || '';
      const sizeBytes = base64Part.length * 0.75;
      const sizeMB = sizeBytes / (1024 * 1024);
      console.log(`Image size: ${sizeMB.toFixed(1)}MB`);

      if (sizeMB > 10) {
        return NextResponse.json({
          success: false,
          error: 'Image too large. Please use a smaller photo (under 10MB).'
        }, { status: 400 });
      }
    }

    console.log('Calling GLM-4.6V-Flash for label analysis...');

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
              text: 'Extract wine info from this label. Return ONLY valid JSON, no markdown: {"winery":"","wine_name":"","variety":"","region":"","country":"","vintage":"","price":null,"tasting_notes":""}'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }],
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('VLM error:', res.status, errText.slice(0, 300));
      return NextResponse.json({
        success: false,
        error: `Vision API error (${res.status}). Try again in a moment.`
      }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
    console.log('VLM content:', content.slice(0, 200));
    if (!content && reasoning) {
      console.log('VLM used all tokens on reasoning, content empty');
    }

    // Parse JSON
    let extracted: any = {};
    try {
      const clean = content.replace(/```\w*\n?/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch {
      extracted = {};
    }

    let country = extracted.country || 'US';
    if (country.toLowerCase().includes('united states') || country.toLowerCase() === 'usa') country = 'US';

    const variety = extracted.variety ? findVariety(extracted.variety) : findVariety(content);
    const region = extracted.region || PROVINCE_MAP[country] || 'Unknown';
    const vintage = extracted.vintage || 'NV';
    const winery = extracted.winery || 'Unknown';
    const wineName = extracted.wine_name || `${winery} ${variety}`.trim();

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
        tasting_notes: extracted.tasting_notes || `${variety} from ${region}`,
        predicted_price: 0,
        listed_price: typeof extracted.price === 'number' ? extracted.price : null,
        confidence: extracted.wine_name ? 'high' : 'medium',
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze label. Try again or enter details manually.',
    }, { status: 500 });
  }
}
