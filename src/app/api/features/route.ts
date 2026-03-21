import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const shapPath = path.join(process.cwd(), 'public', 'data', 'shap_importance.json');
    const shapData = JSON.parse(fs.readFileSync(shapPath, 'utf8'));
    
    return NextResponse.json({
      price_model: shapData.price_model,
      rating_model: shapData.rating_model,
      insights: shapData.insights,
    });
  } catch (error) {
    console.error('Error loading SHAP data:', error);
    return NextResponse.json(
      { error: 'Failed to load feature importance data' },
      { status: 500 }
    );
  }
}
