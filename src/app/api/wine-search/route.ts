import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

/**
 * Wine Search API
 * 
 * Searches multiple wine retailers for live pricing using web search.
 * Currently searches Wine-Searcher, Vivino, and other wine retailers.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wineName = searchParams.get('name');
  const variety = searchParams.get('variety');
  const vintage = searchParams.get('vintage');
  const region = searchParams.get('region');
  
  if (!wineName && !variety) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Please provide wine name or variety',
        results: [],
        query: '',
        sources: [],
        timestamp: new Date().toISOString()
      } as WineSearchResponse,
      { status: 400 }
    );
  }
  
  // Build search query
  const queryParts = [
    wineName,
    vintage,
    variety,
    region,
    'wine',
    'price',
    'buy'
  ].filter(Boolean);
  
  const searchQuery = queryParts.join(' ');
  
  try {
    const zai = await ZAI.create();
    
    // Search for wine prices
    const searchResults = await zai.functions.invoke('web_search', {
      query: searchQuery,
      num: 10
    });
    
    // Parse and structure results
    const wineResults: WineSearchResult[] = [];
    const sources = new Set<string>();
    
    for (const result of searchResults) {
      const url = result.url;
      const hostName = result.host_name;
      
      // Extract merchant from hostname
      let merchant = 'Unknown';
      if (hostName.includes('wine-searcher')) {
        merchant = 'Wine-Searcher';
      } else if (hostName.includes('vivino')) {
        merchant = 'Vivino';
      } else if (hostName.includes('wine.com')) {
        merchant = 'Wine.com';
      } else if (hostName.includes('totalwine')) {
        merchant = 'Total Wine';
      } else if (hostName.includes('bevmo')) {
        merchant = 'BevMo';
      } else if (hostName.includes('instacart')) {
        merchant = 'Instacart';
      } else if (hostName.includes('drizly')) {
        merchant = 'Drizly';
      } else if (hostName.includes('vivant')) {
        merchant = 'Vivant';
      } else if (hostName.includes('winespectator')) {
        merchant = 'Wine Spectator';
      } else {
        // Clean up hostname for display
        merchant = hostName
          .replace('www.', '')
          .replace('.com', '')
          .replace('.net', '')
          .replace('.org', '')
          .split('.')[0];
        merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
      }
      
      sources.add(merchant);
      
      // Try to extract price from snippet
      const priceMatch = result.snippet.match(/\$(\d+(?:\.\d{2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      
      // Extract rating if present
      const ratingMatch = result.snippet.match(/(\d(?:\.\d)?)\s*(?:\/5|stars?)/i);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      
      // Extract vintage
      const vintageMatch = result.snippet.match(/\b(19[9][0-9]|20[0-2][0-9])\b/);
      const foundVintage = vintageMatch ? vintageMatch[1] : vintage;
      
      wineResults.push({
        name: result.name,
        merchant,
        price: price || 0,
        url: url,
        rating: rating || undefined,
        vintage: foundVintage,
        region: region || undefined,
      });
    }
    
    // Sort results - prioritize those with prices
    const sortedResults = wineResults.sort((a, b) => {
      // Prioritize results with prices
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;
      // Then by price (ascending)
      if (a.price && b.price) return a.price - b.price;
      return 0;
    });
    
    // Limit to top results
    const limitedResults = sortedResults.slice(0, 8);
    
    const response: WineSearchResponse = {
      success: true,
      query: searchQuery,
      results: limitedResults,
      sources: Array.from(sources),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Wine search error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search for wine prices. Please try again.',
        query: searchQuery,
        results: [],
        sources: [],
        timestamp: new Date().toISOString()
      } as WineSearchResponse,
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for more detailed searches
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      winery, 
      variety, 
      vintage, 
      region, 
      country 
    } = body;
    
    // Build comprehensive search query
    const queryParts = [
      name || winery,
      vintage,
      variety,
      region,
      country,
      'wine',
      'price',
      'buy online'
    ].filter(Boolean);
    
    const searchQuery = queryParts.join(' ');
    
    const zai = await ZAI.create();
    
    // Search multiple queries for better coverage
    const searches = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `${name || winery} ${vintage || ''} ${variety || ''} wine price buy`.trim(),
        num: 5
      }),
      zai.functions.invoke('web_search', {
        query: `${name || winery} ${vintage || ''} site:wine-searcher.com`.trim(),
        num: 3
      }),
      zai.functions.invoke('web_search', {
        query: `${name || winery} ${vintage || ''} site:vivino.com`.trim(),
        num: 3
      })
    ]);
    
    // Combine and deduplicate results
    const seenUrls = new Set<string>();
    const wineResults: WineSearchResult[] = [];
    const sources = new Set<string>();
    
    for (const searchResult of searches) {
      for (const result of searchResult) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        
        const hostName = result.host_name;
        let merchant = 'Unknown';
        
        if (hostName.includes('wine-searcher')) merchant = 'Wine-Searcher';
        else if (hostName.includes('vivino')) merchant = 'Vivino';
        else if (hostName.includes('wine.com')) merchant = 'Wine.com';
        else if (hostName.includes('totalwine')) merchant = 'Total Wine';
        else if (hostName.includes('bevmo')) merchant = 'BevMo';
        else if (hostName.includes('instacart')) merchant = 'Instacart';
        else {
          merchant = hostName.replace('www.', '').replace('.com', '').split('.')[0];
          merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
        }
        
        sources.add(merchant);
        
        const priceMatch = result.snippet.match(/\$(\d+(?:\.\d{2})?)/);
        const ratingMatch = result.snippet.match(/(\d(?:\.\d)?)\s*(?:\/5|stars?)/i);
        
        wineResults.push({
          name: result.name,
          merchant,
          price: priceMatch ? parseFloat(priceMatch[1]) : 0,
          url: result.url,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
          vintage: vintage,
          region: region,
        });
      }
    }
    
    // Sort by price availability and value
    const sortedResults = wineResults.sort((a, b) => {
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;
      if (a.price && b.price) return a.price - b.price;
      return 0;
    }).slice(0, 10);
    
    return NextResponse.json({
      success: true,
      query: searchQuery,
      results: sortedResults,
      sources: Array.from(sources),
      timestamp: new Date().toISOString()
    } as WineSearchResponse);
    
  } catch (error) {
    console.error('Wine search POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search for wine prices',
        query: '',
        results: [],
        sources: [],
        timestamp: new Date().toISOString()
      } as WineSearchResponse,
      { status: 500 }
    );
  }
}
