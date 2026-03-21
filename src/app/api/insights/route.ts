import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const undervaluedPath = path.join(process.cwd(), 'public', 'data', 'undervalued_wines.json');
    const tasterPath = path.join(process.cwd(), 'public', 'data', 'taster_bias.json');
    
    const undervalued = JSON.parse(fs.readFileSync(undervaluedPath, 'utf8'));
    const taster = JSON.parse(fs.readFileSync(tasterPath, 'utf8'));
    
    return NextResponse.json({
      undervalued_wines: undervalued.undervalued_wines,
      taster_bias: taster.tasters,
      taster_visualization: taster.visualization_data,
      insights: {
        ...undervalued.insights,
        ...taster.overall_insights,
      },
    });
  } catch (error) {
    console.error('Error loading insights data:', error);
    return NextResponse.json(
      { error: 'Failed to load insights data' },
      { status: 500 }
    );
  }
}
