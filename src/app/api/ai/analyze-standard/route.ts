import { NextResponse } from 'next/server';
import { analyzeBisDocumentWithAI } from '@/lib/aiDocumentAnalyzer';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { text, fileName } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required for AI analysis' }, { status: 400 });
    }

    const analyzedStandard = await analyzeBisDocumentWithAI(text, fileName || 'BIS_Standard.pdf');

    return NextResponse.json({
      success: true,
      standard: analyzedStandard
    });
  } catch (error: any) {
    console.error('Error during AI standard analysis:', error);
    return NextResponse.json({
      error: error.message || 'Failed to analyze standard context with AI'
    }, { status: 500 });
  }
}
