import { NextResponse } from 'next/server';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { calculateSemanticRelevance } from '@/lib/ragEngine';
import { BISStandard } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { productName, material, usage, businessType, customStandards } = await req.json();

    const query = `${productName || ''} ${material || ''} ${usage || ''}`;
    
    // Combine server dynamic standards with any client passed custom standards
    const dynamicList = getDynamicStandards();
    const allStandardsMap = new Map<string, BISStandard>();
    
    dynamicList.forEach(s => allStandardsMap.set(s.id, s));
    if (Array.isArray(customStandards)) {
      customStandards.forEach((s: BISStandard) => allStandardsMap.set(s.id, s));
    }

    const currentStandards = Array.from(allStandardsMap.values());
    
    const matched = currentStandards.map(std => {
      let score = calculateSemanticRelevance(query, std);
      if (material && std.scope?.toLowerCase().includes(material.toLowerCase())) score += 15;
      if (usage && std.scope?.toLowerCase().includes(usage.toLowerCase())) score += 15;
      return { standard: std, matchScore: Math.min(99, Math.max(30, score * 1.8 + 25)) };
    }).sort((a, b) => b.matchScore - a.matchScore);

    const primaryMatch = matched[0] || { standard: currentStandards[0], matchScore: 85 };

    return NextResponse.json({
      query: { productName, material, usage, businessType },
      primaryMatch: primaryMatch.standard,
      matchConfidence: Math.round(primaryMatch.matchScore),
      secondaryMatches: matched.slice(1, 4).map(m => m.standard),
      recommendations: [
        `Verify if product capacity aligns with ${primaryMatch.standard.isNumber} scope.`,
        `Required testing scheme: ${primaryMatch.standard.applicableScheme}.`,
        `Mandatory QCO Order applies: ${primaryMatch.standard.mandatoryStatus}.`
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Matcher failed' }, { status: 500 });
  }
}
