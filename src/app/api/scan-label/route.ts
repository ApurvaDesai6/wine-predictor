import { NextRequest, NextResponse } from 'next/server';

// Province mappings for different countries
const PROVINCE_MAP: Record<string, string> = {
  'US': 'California', 'France': 'Bordeaux', 'Italy': 'Tuscany', 'Spain': 'Rioja',
  'Argentina': 'Mendoza', 'New Zealand': 'Marlborough', 'Germany': 'Mosel',
  'Australia': 'South Australia', 'Chile': 'Central Valley', 'Portugal': 'Douro',
  'Austria': 'Niederösterreich', 'South Africa': 'Stellenbosch',
};

const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Barolo', 'Brunello', 'Chianti', 'Pinot Gris',
  'Viognier', 'Gewürztraminer', 'Champagne', 'Prosecco', 'Cabernet Franc',
  'Petit Verdot', 'Mourvèdre', 'Grenache', 'Carignan', 'Carmenère',
];

const REGIONS: Record<string, string[]> = {
  'US': ['Napa Valley', 'Sonoma Valley', 'Paso Robles', 'Willamette Valley', 'Russian River Valley', 'Rutherford', 'Alexander Valley', 'Santa Barbara', 'Central Coast', 'Monterey', 'Carneros'],
  'France': ['Bordeaux', 'Burgundy', 'Rhone Valley', 'Champagne', 'Loire Valley', 'Alsace', 'Provence', 'Languedoc', 'Margaux', 'Pauillac', 'Saint-Émilion', 'Beaujolais', 'Chablis'],
  'Italy': ['Tuscany', 'Piedmont', 'Veneto', 'Sicily', 'Chianti Classico', 'Brunello di Montalcino', 'Barolo', 'Barbaresco', 'Amarone'],
  'Spain': ['Rioja', 'Ribera del Duero', 'Priorat', 'Rías Baixas', 'Toro', 'Navarra'],
  'Argentina': ['Mendoza', 'Uco Valley', 'Luján de Cuyo', 'Salta', 'Patagonia'],
  'Australia': ['Barossa Valley', 'McLaren Vale', 'Hunter Valley', 'Yarra Valley', 'Margaret River'],
  'New Zealand': ['Marlborough', 'Central Otago', "Hawke's Bay"],
  'Germany': ['Mosel', 'Rheingau', 'Rheinhessen', 'Pfalz'],
  'Chile': ['Maipo Valley', 'Colchagua Valley', 'Casablanca Valley'],
};

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  'US': ['napa', 'sonoma', 'california', 'oregon', 'paso robles', 'usa', 'american', 'washington'],
  'France': ['bordeaux', 'burgundy', 'bourgogne', 'rhone', 'champagne', 'france', 'french', 'chateau', 'château', 'domaine', 'cru'],
  'Italy': ['tuscany', 'toscana', 'chianti', 'barolo', 'italy', 'italian', 'vino', 'tenuta', 'brunello', 'amarone'],
  'Spain': ['rioja', 'spain', 'spanish', 'ribera', 'tempranillo', 'bodega'],
  'Argentina': ['mendoza', 'argentina', 'malbec'],
  'Australia': ['barossa', 'australia', 'australian', 'shiraz'],
  'New Zealand': ['marlborough', 'new zealand', 'sauvignon blanc'],
  'Germany': ['mosel', 'germany', 'german', 'riesling', 'rheingau', 'spätlese'],
};

function findVariety(text: string): string {
  const lower = text.toLowerCase();
  for (const v of COMMON_VARIETIES) {
    if (lower.includes(v.toLowerCase())) return v;
  }
  // Partial word matching
  const words = lower.split(/[\s,\-()]+/);
  for (const v of COMMON_VARIETIES) {
    const vWords = v.toLowerCase().split(/\s+/);
    if (vWords.some(vw => vw.length > 4 && words.some(w => w.includes(vw)))) return v;
  }
  return 'Red Blend';
}

function findCountry(text: string): string {
  const lower = text.toLowerCase();
  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return country;
  }
  return 'US';
}

function findRegion(text: string, country: string): string {
  const lower = text.toLowerCase();
  const regions = REGIONS[country] || REGIONS['US'];
  for (const r of regions) {
    if (lower.includes(r.toLowerCase())) return r;
  }
  return regions[0] || 'Unknown';
}

function findVintage(text: string): string {
  const matches = text.match(/\b(19[89]\d|20[0-2]\d)\b/g);
  if (matches) {
    const years = matches.map(Number).filter(y => y >= 1980 && y <= new Date().getFullYear());
    if (years.length > 0) return Math.max(...years).toString();
  }
  return 'NV';
}

function findPrice(text: string): number | null {
  const match = text.match(/\$\s*(\d{1,4}(?:\.\d{2})?)/);
  if (match) {
    const price = parseFloat(match[1]);
    if (price >= 5 && price <= 5000) return price;
  }
  return null;
}

function findWinery(text: string): string {
  // Look for common winery patterns
  const patterns = [
    /(?:chateau|château|domaine|estate|vineyard|winery|cellars|wines)\s+([A-Z][a-zA-Zé\s'-]+)/i,
    /^([A-Z][a-zA-Zé\s'-]{2,30})$/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1]?.trim() || m[0]?.trim();
  }
  // Take the first capitalized multi-word line as winery name
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[A-Z][a-zA-Z\s'-]{3,40}$/.test(line) && !COMMON_VARIETIES.some(v => line.toLowerCase().includes(v.toLowerCase()))) {
      return line;
    }
  }
  return 'Unknown Winery';
}

async function ocrWithTesseract(imageBase64: string): Promise<string> {
  // Dynamic import to avoid bundling issues
  const Tesseract = await import('tesseract.js');

  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const { data } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {},
  });

  return data.text;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    // Run OCR on the label image
    let ocrText: string;
    try {
      ocrText = await ocrWithTesseract(image);
    } catch (ocrError: any) {
      console.error('OCR error:', ocrError);
      return NextResponse.json(
        { success: false, error: 'Failed to read label. Try a clearer photo.' },
        { status: 500 }
      );
    }

    console.log('OCR extracted text:', ocrText);

    // Parse wine info from OCR text
    const country = findCountry(ocrText);
    const variety = findVariety(ocrText);
    const region = findRegion(ocrText, country);
    const vintage = findVintage(ocrText);
    const winery = findWinery(ocrText);
    const listedPrice = findPrice(ocrText);
    const province = PROVINCE_MAP[country] || region;

    const wineName = `${winery} ${variety} ${vintage !== 'NV' ? vintage : ''}`.trim();

    const wineData = {
      name: wineName,
      variety,
      region,
      country,
      province,
      vintage,
      winery,
      rating: 4.0,
      tasting_notes: `Label text extracted via OCR. Detected: ${variety} from ${region}, ${country}.`,
      predicted_price: 0,
      listed_price: listedPrice,
      confidence: listedPrice ? 'high' : 'medium',
      ocr_text: ocrText.slice(0, 500),
    };

    return NextResponse.json({ success: true, wine: wineData });
  } catch (error: any) {
    console.error('Label scan error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze wine label. Please try again.',
        wine: {
          name: 'Unknown Wine', variety: 'Red Blend', region: 'Napa Valley',
          country: 'US', province: 'California', vintage: 'NV', rating: 4.0,
          tasting_notes: 'Unable to read label. Enter details manually.',
          predicted_price: 0, listed_price: null, confidence: 'low',
        },
      },
      { status: 500 }
    );
  }
}
