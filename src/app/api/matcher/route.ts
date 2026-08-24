import { NextResponse } from 'next/server';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { calculateSemanticRelevance } from '@/lib/ragEngine';
import { BISStandard } from '@/lib/types';

interface DisambiguationData {
  isHybrid: boolean;
  question: string;
  options: {
    label: string;
    description: string;
    targetStandardId: string;
    scheme: string;
  }[];
}

function detectHybridDisambiguation(query: string): DisambiguationData | null {
  const q = query.toLowerCase();
  
  if (q.includes('smart watch') || q.includes('smartwatch') || q.includes('pulse oximeter') || q.includes('health band') || q.includes('fitness tracker')) {
    return {
      isHybrid: true,
      question: "Is the primary intended function consumer telecommunication / smart assistant, or medical diagnostic monitoring?",
      options: [
        {
          label: "Consumer IT & Wireless Telecommunication",
          description: "Primary usage as Bluetooth/WiFi smart watch with general fitness tracking.",
          targetStandardId: "is-13252-1",
          scheme: "CRS (Compulsory Registration Scheme - IS 13252)"
        },
        {
          label: "Medical Grade Diagnostic Device",
          description: "Marketed for clinical pulse oximetry, ECG, or disease diagnostic indications.",
          targetStandardId: "is-302-2-3",
          scheme: "CDSCO Medical Device Rules + Specific Electromedical Standard"
        }
      ]
    };
  }

  if (q.includes('led mirror') || q.includes('vanity mirror') || q.includes('lighted mirror')) {
    return {
      isHybrid: true,
      question: "Is the product classified primarily as a mains-powered luminaire fixture or decorative glass?",
      options: [
        {
          label: "Electric Luminaire with Integrated LEDs",
          description: "Mains or adapter powered with internal LED strip.",
          targetStandardId: "is-16102-1",
          scheme: "CRS / Scheme-I (IS 10322 / IS 16102)"
        },
        {
          label: "Non-Electric Decorative Glass Mirror",
          description: "Standard silvered glass mirror without electrical components.",
          targetStandardId: "is-269",
          scheme: "Voluntary General Float Glass Standard"
        }
      ]
    };
  }

  if (q.includes('smart toy') || (q.includes('toy') && (q.includes('camera') || q.includes('bluetooth') || q.includes('battery')))) {
    return {
      isHybrid: true,
      question: "Is the product designed for child play value (under 14 years) or consumer electronics gadget?",
      options: [
        {
          label: "Toy with Child Play Value (< 14 Years)",
          description: "Mandatory Safety of Toys QCO applies with mechanical, flammability and electrical testing.",
          targetStandardId: "is-9873-1",
          scheme: "Scheme-I (Mandatory ISI Mark - IS 9873 Parts 1, 2, 3)"
        },
        {
          label: "Consumer IT & Wireless Gadget",
          description: "Adult or general consumer electronics item (e.g. drone, action camera).",
          targetStandardId: "is-13252-1",
          scheme: "CRS (IS 13252 / IS 16046)"
        }
      ]
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const { productName, hsnCode, material, usage, businessType, customStandards } = await req.json();

    const query = `${productName || ''} ${hsnCode || ''} ${material || ''} ${usage || ''}`;
    
    // Combine server dynamic standards with any client passed custom standards
    const dynamicList = getDynamicStandards();
    const allStandardsMap = new Map<string, BISStandard>();
    
    dynamicList.forEach(s => allStandardsMap.set(s.id, s));
    if (Array.isArray(customStandards)) {
      customStandards.forEach((s: BISStandard) => allStandardsMap.set(s.id, s));
    }

    const currentStandards = Array.from(allStandardsMap.values());
    const cleanHsn = (hsnCode || '').replace(/[\s.-]/g, '');

    const matched = currentStandards.map(std => {
      let score = calculateSemanticRelevance(query, std);
      
      // Direct HSN code exact / prefix match bonus (+45 points)
      if (cleanHsn && std.hsnCodes) {
        const hasHsnMatch = std.hsnCodes.some(h => {
          const cleanStdHsn = h.replace(/[\s.-]/g, '');
          return cleanStdHsn.startsWith(cleanHsn) || cleanHsn.startsWith(cleanStdHsn) || cleanStdHsn.includes(cleanHsn);
        });
        if (hasHsnMatch) {
          score += 45;
        }
      }

      if (material && std.scope?.toLowerCase().includes(material.toLowerCase())) score += 15;
      if (usage && std.scope?.toLowerCase().includes(usage.toLowerCase())) score += 15;
      
      return { standard: std, matchScore: Math.min(99, Math.max(30, score * 1.8 + 25)) };
    }).sort((a, b) => b.matchScore - a.matchScore);

    const primaryMatch = matched[0] || { standard: currentStandards[0], matchScore: 85 };
    const disambiguation = detectHybridDisambiguation(`${productName || ''} ${query}`);

    return NextResponse.json({
      query: { productName, hsnCode, material, usage, businessType },
      primaryMatch: primaryMatch.standard,
      matchConfidence: Math.round(primaryMatch.matchScore),
      secondaryMatches: matched.slice(1, 4).map(m => m.standard),
      disambiguation,
      recommendations: [
        `Verify if product capacity aligns with ${primaryMatch.standard.isNumber} scope.`,
        `Required testing scheme: ${primaryMatch.standard.applicableScheme}.`,
        `Mandatory QCO Order applies: ${primaryMatch.standard.mandatoryStatus} (${primaryMatch.standard.qcoGazetteRef || 'Official Gazette Order'}).`,
        cleanHsn ? `Mapped to Customs Tariff HSN: ${cleanHsn}` : 'Specify 8-digit HSN code for customs clearance validation.'
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Matcher failed' }, { status: 500 });
  }
}
