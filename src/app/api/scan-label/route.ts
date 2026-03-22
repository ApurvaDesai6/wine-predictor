import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Province mappings for different countries
const PROVINCE_MAP: Record<string, string> = {
  'US': 'California',
  'France': 'Bordeaux',
  'Italy': 'Tuscany',
  'Spain': 'Rioja',
  'Argentina': 'Mendoza',
  'New Zealand': 'Marlborough',
  'Germany': 'Mosel',
  'Australia': 'South Australia',
  'Chile': 'Central Valley',
  'Portugal': 'Douro',
  'Austria': 'Niederösterreich',
  'South Africa': 'Stellenbosch',
};

// Common wine varieties for fuzzy matching
const COMMON_VARIETIES = [
  'Cabernet Sauvignon', 'Pinot Noir', 'Chardonnay', 'Merlot', 'Zinfandel',
  'Sauvignon Blanc', 'Malbec', 'Pinot Grigio', 'Syrah', 'Shiraz',
  'Bordeaux-style Red Blend', 'Rosé', 'Riesling', 'Tempranillo', 'Sangiovese',
  'Nebbiolo', 'Barolo', 'Brunello', 'Chianti', 'Pinot Gris',
  'Viognier', 'Gewürztraminer', 'Champagne', 'Prosecco', 'Cabernet Franc',
  'Petit Verdot', 'Mourvèdre', 'Grenache', 'Carignan', 'Carmenère'
];

// Common regions for fuzzy matching
const REGIONS: Record<string, string[]> = {
  'US': ['Napa Valley', 'Sonoma Valley', 'Paso Robles', 'Willamette Valley', 'Russian River Valley', 'Rutherford', 'Stags Leap District', 'Alexander Valley', 'Dry Creek Valley', 'Santa Barbara', 'Central Coast', 'Monterey', 'Carneros'],
  'France': ['Bordeaux', 'Burgundy', 'Rhone Valley', 'Champagne', 'Loire Valley', 'Alsace', 'Provence', 'Languedoc', 'Margaux', 'Pauillac', 'Saint-Émilion', 'Beaujolais', 'Chablis'],
  'Italy': ['Tuscany', 'Piedmont', 'Veneto', 'Sicily', 'Chianti Classico', 'Brunello di Montalcino', 'Barolo', 'Barbaresco', 'Amarone', 'Prosecco', 'Super Tuscan'],
  'Spain': ['Rioja', 'Ribera del Duero', 'Priorat', 'Rías Baixas', 'Toro', 'Jerez', 'Cava', 'Navarra'],
  'Argentina': ['Mendoza', 'Uco Valley', 'Luján de Cuyo', 'Maipú', 'Salta', 'Patagonia'],
  'Australia': ['Barossa Valley', 'McLaren Vale', 'Hunter Valley', 'Yarra Valley', 'Margaret River', 'Adelaide Hills'],
  'New Zealand': ['Marlborough', 'Central Otago', 'Hawke\'s Bay', 'Wairau Valley', 'Martinborough'],
  'Germany': ['Mosel', 'Rheingau', 'Rheinhessen', 'Pfalz', 'Nahe'],
  'Chile': ['Maipo Valley', 'Colchagua Valley', 'Casablanca Valley', 'Rapel Valley'],
};

// Find best match for a variety name
function findBestVarietyMatch(extracted: string): string {
  if (!extracted) return 'Red Blend';
  
  const normalized = extracted.toLowerCase().trim();
  
  // Exact match
  const exact = COMMON_VARIETIES.find(v => v.toLowerCase() === normalized);
  if (exact) return exact;
  
  // Partial match
  const partial = COMMON_VARIETIES.find(v => 
    v.toLowerCase().includes(normalized) || normalized.includes(v.toLowerCase())
  );
  if (partial) return partial;
  
  // Word match
  const words = normalized.split(/[\s,\-]+/);
  for (const word of words) {
    if (word.length > 3) {
      const match = COMMON_VARIETIES.find(v => 
        v.toLowerCase().includes(word)
      );
      if (match) return match;
    }
  }
  
  return extracted || 'Red Blend';
}

// Find best region match
function findBestRegionMatch(extracted: string, country: string): string {
  if (!extracted) {
    return REGIONS[country]?.[0] || 'Unknown';
  }
  
  const normalized = extracted.toLowerCase().trim();
  const countryRegions = REGIONS[country] || REGIONS['US'];
  
  // Exact match
  const exact = countryRegions.find(r => r.toLowerCase() === normalized);
  if (exact) return exact;
  
  // Partial match
  const partial = countryRegions.find(r => 
    r.toLowerCase().includes(normalized) || normalized.includes(r.toLowerCase())
  );
  if (partial) return partial;
  
  // Word match
  const words = normalized.split(/[\s,\-]+/);
  for (const word of words) {
    if (word.length > 3) {
      const match = countryRegions.find(r => 
        r.toLowerCase().includes(word)
      );
      if (match) return match;
    }
  }
  
  return extracted;
}

// Determine country from region or text
function determineCountry(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('napa') || lowerText.includes('sonoma') || lowerText.includes('california') || 
      lowerText.includes('oregon') || lowerText.includes('paso robles') || lowerText.includes('u.s.a') ||
      lowerText.includes('usa') || lowerText.includes('american')) {
    return 'US';
  }
  if (lowerText.includes('bordeaux') || lowerText.includes('burgundy') || lowerText.includes('rhone') ||
      lowerText.includes('champagne') || lowerText.includes('france') || lowerText.includes('french')) {
    return 'France';
  }
  if (lowerText.includes('tuscany') || lowerText.includes('chianti') || lowerText.includes('barolo') ||
      lowerText.includes('italy') || lowerText.includes('italian') || lowerText.includes('toscano')) {
    return 'Italy';
  }
  if (lowerText.includes('rioja') || lowerText.includes('spain') || lowerText.includes('spanish')) {
    return 'Spain';
  }
  if (lowerText.includes('mendoza') || lowerText.includes('argentina') || lowerText.includes('argentin')) {
    return 'Argentina';
  }
  if (lowerText.includes('barossa') || lowerText.includes('australia') || lowerText.includes('australian')) {
    return 'Australia';
  }
  if (lowerText.includes('marlborough') || lowerText.includes('new zealand')) {
    return 'New Zealand';
  }
  if (lowerText.includes('mosel') || lowerText.includes('germany') || lowerText.includes('german')) {
    return 'Germany';
  }
  
  return 'US';
}

// Extract vintage year from text
function extractVintage(text: string): string {
  const currentYear = new Date().getFullYear();
  const yearPattern = /\b(19[9][0-9]|20[0-2][0-9])\b/g;
  const matches = text.match(yearPattern);
  
  if (matches) {
    const years = matches.map(m => parseInt(m)).filter(y => y >= 1990 && y <= currentYear);
    if (years.length > 0) {
      return Math.max(...years).toString();
    }
  }
  
  return 'NV';
}

// Extract rating from text
function extractRating(text: string): number {
  const patterns = [
    /(\d(?:\.\d)?)\s*(?:\/5|out of 5|stars?)/i,
    /(\d{2,3})\s*(?:pts?|points?)/i,
    /(?:rated?|rating)[:\s]*(\d(?:\.\d)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (value > 10) {
        return Math.round(((value - 80) / 20 + 1) * 10) / 10;
      }
      return Math.round(value * 10) / 10;
    }
  }
  
  return 4.0;
}

// Extract price from text - more careful extraction
function extractPrice(text: string): number | null {
  // Look for explicit price patterns
  const patterns = [
    // Look for $XX or $XX.XX with word boundaries
    /\$\s*(\d{1,4}(?:\.\d{2})?)\b/,
    // MSRP or Price mentioned
    /(?:MSRP|Retail\s*Price|Price)[:\s]*\$?\s*(\d{1,4}(?:\.\d{2})?)/i,
    // Price at the end of a line
    /price[:\s]*\$?\s*(\d{1,4}(?:\.\d{2})?)$/im,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1]);
      // Sanity check - wine prices should be between $5 and $5000
      if (price >= 5 && price <= 5000) {
        return price;
      }
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Initialize VLM
    const zai = await ZAI.create();
    
    // Use createVision for image analysis
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a wine expert analyzing a wine label image. Extract ALL visible information and return ONLY a valid JSON object (no markdown, no explanation).

Extract these fields:
- winery: the producer/winery name
- wine_name: the full wine name on the label
- variety: the grape variety (e.g., "Cabernet Sauvignon", "Pinot Noir", "Chardonnay")
- region: the specific wine region/AVA
- country: country of origin (use full name like "United States", "France", "Italy")
- vintage: the harvest year (4 digits)
- rating: any rating shown (convert to 1-5 scale)
- price: any price shown on the label
- alcohol_content: ABV percentage
- tasting_notes: any tasting notes visible
- all_text: all visible text from the label

Return ONLY valid JSON like:
{"winery":"...","wine_name":"...","variety":"...","region":"...","country":"...","vintage":"...","rating":4.2,"price":45,"alcohol_content":"14.5%","tasting_notes":"...","all_text":"..."}`
            },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    const analysisText = response.choices[0]?.message?.content || '';
    console.log('VLM Response:', analysisText);
    
    // Parse the JSON response
    let extractedData;
    try {
      // Clean the response - remove any markdown formatting
      let cleanText = analysisText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\w*\n?/g, '').trim();
      }
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse VLM response:', parseError);
      extractedData = {
        winery: 'Unknown Winery',
        wine_name: 'Unknown Wine',
        variety: '',
        region: '',
        country: '',
        vintage: '',
        rating: null,
        price: null,
        tasting_notes: '',
        all_text: analysisText
      };
    }

    // Process and validate extracted data
    const allText = extractedData.all_text || analysisText;
    
    // Normalize country name
    let country = extractedData.country || determineCountry(allText);
    if (country.toLowerCase().includes('united states') || country.toLowerCase() === 'usa') {
      country = 'US';
    }
    
    const variety = findBestVarietyMatch(extractedData.variety || '');
    const region = findBestRegionMatch(extractedData.region || '', country);
    const vintage = extractedData.vintage || extractVintage(allText);
    const rating = extractedData.rating || extractRating(allText);
    const listedPrice = extractedData.price || extractPrice(allText);

    // Get province from country
    const province = PROVINCE_MAP[country] || region;

    // Construct wine name
    const wineName = extractedData.wine_name || 
      `${extractedData.winery || 'Unknown'} ${variety} ${vintage !== 'NV' ? vintage : ''}`.trim();

    // DO NOT generate a fake listed_price - leave it null if not found
    // The frontend will fetch live prices to provide accurate comparisons
    const wineData = {
      name: wineName,
      variety: variety,
      region: region,
      country: country,
      province: province,
      vintage: vintage,
      winery: extractedData.winery || '',
      rating: Math.min(5, Math.max(1, rating)),
      tasting_notes: extractedData.tasting_notes || 'Wine detected - details extracted from label',
      predicted_price: 0, // Will be calculated by /api/predict
      listed_price: listedPrice, // Only set if found on label
      confidence: listedPrice ? 'high' : 'medium'
    };

    console.log('Processed wine data:', wineData);

    return NextResponse.json({
      success: true,
      wine: wineData
    });

  } catch (error) {
    console.error('Label scan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to analyze wine label. Please try again.',
        wine: {
          name: 'Unknown Wine',
          variety: 'Red Blend',
          region: 'Napa Valley',
          country: 'US',
          province: 'California',
          vintage: 'NV',
          rating: 4.0,
          tasting_notes: 'Unable to read label - please enter details manually',
          predicted_price: 0, // Will be calculated by /api/predict
          listed_price: null, // No fake price
          confidence: 'low'
        }
      },
      { status: 500 }
    );
  }
}
