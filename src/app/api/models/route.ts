import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'public', 'data', 'model_comparison.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading model data:', error);
    return NextResponse.json(
      { error: 'Failed to load model comparison data' },
      { status: 500 }
    );
  }
}
