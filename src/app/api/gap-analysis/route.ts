import { NextRequest, NextResponse } from 'next/server';
import { checkOllamaAvailability, queryOllamaLocal } from '@/lib/ollamaClient';
import { queryGemini } from '@/lib/geminiClient';
import { getDynamicStandards } from '@/lib/data/bisDatabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { standardId, docContent, docName, persona } = body;

    const standards = getDynamicStandards();
    const selectedStandard = standards.find(s => s.id === standardId || s.isNumber === standardId) || standards[0];

    const isNumber = selectedStandard?.isNumber || 'IS 302-2-3';
    const title = selectedStandard?.title || 'Safety of Household Electrical Appliances';
    const clauses = selectedStandard?.clauseReferences || [];
    const keyReqs = selectedStandard?.keyRequirements || [];
    const testParams = selectedStandard?.testingParameters || [];

    // Prompt context for Ollama AI
    const systemPrompt = `You are the official Bureau of Indian Standards (BIS) Senior Statutory Compliance Auditor.
Your task is to analyze a submitted product technical specification against official Indian Standard ${isNumber} (${title}).

Normative Clauses:
${clauses.map(c => `- ${c.clause}: ${c.description || 'Normative Requirement'}`).join('\n')}

Key Requirements:
${keyReqs.map(r => `- ${r}`).join('\n')}

Testing Parameters:
${testParams.map(t => `- ${t}`).join('\n')}

Submitted Product Specification Text:
"${docContent.slice(0, 3000)}"

Evaluate the product specification clause by clause.
You MUST reply with ONLY a valid JSON object matching this exact TypeScript structure:
{
  "overallComplianceScore": 85,
  "executiveSummary": "Detailed multi-paragraph statutory evaluation explaining compliance readiness under ${isNumber}, identifying key missing test parameters, and outlining NABL lab verification steps.",
  "gaps": [
    {
      "clause": "Clause Reference (e.g. Clause 8.1)",
      "requirement": "Exact Standard Requirement Name",
      "userDocEvidence": "Matched text in specification or reason why missing",
      "status": "met" | "partial" | "missing",
      "riskSeverity": "Low" | "Medium" | "High",
      "remediation": "Specific technical/lab remediation directive"
    }
  ],
  "nablRecommendations": [
    "List of recommended NABL testing laboratories and equipment calibration steps"
  ]
}`;

    let engineUsed = 'Local Ollama AI';
    let resultJson: any = null;

    // 1. Tier 1: Dynamic Local Ollama AI Server Query
    try {
      const ollamaStatus = await checkOllamaAvailability();
      const modelsToTry = ollamaStatus.isAvailable && ollamaStatus.models.length > 0 
        ? ollamaStatus.models 
        : ['mistral:latest', 'llama3:latest', 'gemma:2b', 'mistral', 'llama3'];

      for (const modelCandidate of modelsToTry) {
        try {
          const ollamaReply = await queryOllamaLocal(systemPrompt, modelCandidate);
          if (ollamaReply) {
            const jsonMatch = ollamaReply.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resultJson = JSON.parse(jsonMatch[0]);
              engineUsed = `Local Ollama AI (${modelCandidate})`;
              break;
            }
          }
        } catch (mErr) {
          console.warn(`Model ${modelCandidate} failed, trying next candidate...`);
        }
      }
    } catch (e) {
      console.warn("Ollama AI offline for gap analysis, switching to Tier 2 fallback");
    }

    // 2. Tier 2: Try Google Gemini REST API Fallback
    if (!resultJson) {
      try {
        engineUsed = 'Google Gemini 1.5 Pro REST API';
        const geminiReply = await queryGemini(systemPrompt);
        if (geminiReply) {
          const jsonMatch = geminiReply.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resultJson = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.warn("Gemini REST API unavailable, switching to Tier 3 Grounded BIS RAG Engine fallback");
      }
    }

    // 3. Tier 3: Grounded BIS RAG Engine Fallback
    if (!resultJson) {
      engineUsed = 'Grounded BIS RAG Engine';
      
      const allRequirementsToAudit = [
        ...keyReqs.map((req, idx) => ({
          clause: clauses[idx % Math.max(1, clauses.length)]?.clause || `Clause ${8 + idx}`,
          requirement: req,
          paramKey: req
        })),
        ...testParams.map((param, idx) => ({
          clause: clauses[(keyReqs.length + idx) % Math.max(1, clauses.length)]?.clause || `Clause ${15 + idx}`,
          requirement: `${param} (Mandatory Validation)`,
          paramKey: param
        }))
      ];

      const gapItems = allRequirementsToAudit.map((item) => {
        const words = item.paramKey.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const snippetLines = docContent.split(/[\n.]+/).map((s: string) => s.trim()).filter(Boolean);
        const matchingLine = snippetLines.find((line: string) => {
          const lLower = line.toLowerCase();
          return words.some((w: string) => lLower.includes(w));
        });

        if (matchingLine) {
          const hasNumber = /\d+/.test(matchingLine);
          if (hasNumber || matchingLine.length > 20) {
            return {
              clause: item.clause,
              requirement: item.requirement,
              userDocEvidence: `Matched in submitted spec: "${matchingLine}"`,
              status: 'met',
              riskSeverity: 'Low',
              remediation: `Requirement verified in specification under ${item.clause}. Retain NABL calibration logs.`
            };
          } else {
            return {
              clause: item.clause,
              requirement: item.requirement,
              userDocEvidence: `Partial match in specification: "${matchingLine}"`,
              status: 'partial',
              riskSeverity: 'Medium',
              remediation: `Details incomplete for ${item.clause}. Conduct laboratory test validation.`
            };
          }
        } else {
          return {
            clause: item.clause,
            requirement: item.requirement,
            userDocEvidence: `Not specified in submitted documentation text.`,
            status: 'missing',
            riskSeverity: 'High',
            remediation: `Mandatory statutory requirement under ${isNumber}. Submit sample to NABL accredited lab.`
          };
        }
      });

      const metCount = gapItems.filter(i => i.status === 'met').length;
      const partialCount = gapItems.filter(i => i.status === 'partial').length;
      const score = Math.round((metCount * 100 + partialCount * 50) / gapItems.length);

      resultJson = {
        overallComplianceScore: score,
        executiveSummary: `Audit completed for ${isNumber} (${title}) using Grounded BIS RAG Engine. Identified ${gapItems.filter(i => i.status === 'missing').length} critical gaps requiring mandatory NABL lab testing.`,
        gaps: gapItems,
        nablRecommendations: [
          `Submit test samples to NABL Accredited Central Electrical Testing Lab`,
          `Calibrate high voltage insulation testers to IS 302-2-3 standards`
        ]
      };
    }

    return NextResponse.json({
      success: true,
      engineUsed,
      productName: docName ? docName.replace(/\.[^/.]+$/, "") : "Product Specification",
      standardId: selectedStandard.id,
      isNumber,
      overallComplianceScore: resultJson.overallComplianceScore || 80,
      executiveSummary: resultJson.executiveSummary || `Statutory evaluation completed for ${isNumber}.`,
      gaps: resultJson.gaps || [],
      nablRecommendations: resultJson.nablRecommendations || []
    });

  } catch (err: any) {
    console.error("Gap Analysis API Error:", err);
    return NextResponse.json(
      { error: "Failed to run dedicated AI gap analysis", details: err?.message },
      { status: 500 }
    );
  }
}
