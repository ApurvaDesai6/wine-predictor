import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Cabernet Franc', 'Grenache', 'Mourvèdre', 'Prosecco',
  'Champagne', 'Gewürztraminer', 'Viognier', 'Pinot Gris', 'Petit Verdot',
];

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'US': ['napa', 'sonoma', 'california', 'oregon', 'paso robles', 'usa', 'american', 'washington'],
  'France': ['bordeaux', 'burgundy', 'bourgogne', 'rhone', 'champagne', 'france', 'chateau', 'château', 'domaine', 'cru'],
  'Italy': ['tuscany', 'toscana', 'chianti', 'barolo', 'italy', 'italian', 'tenuta', 'brunello'],
  'Spain': ['rioja', 'spain', 'ribera', 'tempranillo', 'bodega'],
  'Argentina': ['mendoza', 'argentina', 'malbec'],
  'Australia': ['barossa', 'australia', 'shiraz'],
  'New Zealand': ['marlborough', 'new zealand'],
  'Germany': ['mosel', 'germany', 'riesling', 'spätlese'],
};

const PROVINCE_MAP: Record<string, string> = {
  'US': 'California', 'France': 'Bordeaux', 'Italy': 'Tuscany', 'Spain': 'Rioja',
  'Argentina': 'Mendoza', 'Australia': 'South Australia', 'Germany': 'Mosel',
  'New Zealand': 'Marlborough', 'Chile': 'Central Valley',
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

function findWinery(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 50);
  for (const line of lines) {
    if (/^[A-Z][a-zA-Zé\s'.-]{2,40}$/.test(line)) {
      const lower = line.toLowerCase();
      if (!COMMON_VARIETIES.some(v => lower.includes(v.toLowerCase())) && !lower.match(/^\d/)) {
        return line;
      }
    }
  }
  return 'Unknown Winery';
}

function findPrice(text: string): number | null {
  const m = text.match(/\$\s*(\d{1,4}(?:\.\d{2})?)/);
  if (m) {
    const p = parseFloat(m[1]);
    if (p >= 5 && p <= 5000) return p;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Run Tesseract OCR
    let ocrText = '';
    try {
      const worker = await createWorker('eng');
      const base64 = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const { data } = await worker.recognize(buffer);
      ocrText = data.text;
      await worker.terminate();
    } catch (ocrErr: any) {
      console.error('OCR failed:', ocrErr.message);
      return NextResponse.json({
        success: false,
        error: 'Could not read the label. Try a clearer, well-lit photo, or enter the wine name manually.',
      }, { status: 422 });
    }

    console.log('OCR text:', ocrText.slice(0, 300));

    const country = findCountry(ocrText);
    const variety = findVariety(ocrText);
    const vintage = findVintage(ocrText);
    const winery = findWinery(ocrText);
    const listedPrice = findPrice(ocrText);
    const province = PROVINCE_MAP[country] || 'Unknown';
    const wineName = `${winery} ${variety} ${vintage !== 'NV' ? vintage : ''}`.trim();

    return NextResponse.json({
      success: true,
      wine: {
        name: wineName,
        variety,
        region: province,
        country,
        province,
        vintage,
        winery,
        rating: 4.0,
        tasting_notes: `Detected: ${variety} from ${country}`,
        predicted_price: 0,
        listed_price: listedPrice,
        confidence: ocrText.length > 50 ? 'medium' : 'low',
        ocr_text: ocrText.slice(0, 500),
      },
    });
  } catch (error: any) {
    console.error('Label scan error:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze label. Try entering the wine name manually.',
      wine: {
        name: 'Unknown Wine', variety: 'Red Blend', region: 'California',
        country: 'US', province: 'California', vintage: 'NV', rating: 4.0,
        tasting_notes: 'Could not read label', predicted_price: 0,
        listed_price: null, confidence: 'low',
      },
    }, { status: 500 });
  }
}
