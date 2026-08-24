import { BISStandard } from './types';
import { parseBisDocumentContent } from './data/bisDatabase';

/**
 * AI Document Context Analyzer for Official Bureau of Indian Standards (BIS) documents.
 * Uses Gemini AI Vision & Context Models to analyze the complete PDF/Markdown context
 * and extract exact headings, statutory IS numbers, clause breakdowns, and test parameters.
 */
export async function analyzeBisDocumentWithAI(
  documentContent: string,
  fileName?: string
): Promise<BISStandard> {
  // 1. Initial heuristic standard baseline
  const baselineStandard = parseBisDocumentContent(fileName || 'BIS_Standard.pdf', documentContent);

  if (!documentContent || documentContent.trim().length < 20) {
    return baselineStandard;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return baselineStandard;
  }

  // Use the most effective context window models
  const modelCandidates = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];

  const prompt = `You are an expert Chief Regulatory Officer and BIS (Bureau of Indian Standards) Standards Analyst.
Analyze the following official Indian Standard document context and extract the exact specifications, statutory details, technical parameters, and clause references.

Document Context:
\"\"\"
${documentContent.slice(0, 32000)}
\"\"\"

Respond STRICTLY with a valid JSON object (no markdown fence, no backticks, pure valid JSON) containing:
{
  "isNumber": "Exact IS code with revision year (e.g. 'IS 302-2-3:2017' or 'IS 15298 (Part 2):2016')",
  "title": "Full official standard title without prefixing IS code (e.g. 'Safety of Household and Similar Electrical Appliances - Part 2 Particular Requirements - Section 3 Electric Irons')",
  "category": "Precise product category (e.g. 'Electrical Safety & Appliances', 'Personal Protective Equipment (PPE)', 'Toys & Children Safety', 'Electronics & IT (CRS)', 'Construction Steel')",
  "applicableScheme": "Exact applicable scheme: one of ['Scheme-I (ISI Mark)', 'CRS (Compulsory Registration)', 'FMCS', 'Hallmarking']",
  "mandatoryStatus": "Statutory status: one of ['Mandatory (QCO)', 'CRS Mandatory', 'Voluntary']",
  "scope": "Comprehensive 2-4 sentence summary of the exact scope and field of application directly from Section 1/Scope of the document.",
  "targetAudience": ["list of specific affected manufacturer/importer/laboratory personas"],
  "keyRequirements": [
    "Specific statutory requirement 1 from the text with exact numbers/limits",
    "Specific statutory requirement 2 from the text with exact numbers/limits",
    "Specific statutory requirement 3 from the text with exact numbers/limits"
  ],
  "requiredDocuments": [
    "Specific required test report or factory QA document 1",
    "Specific required test report or factory QA document 2"
  ],
  "testingParameters": [
    "Specific lab testing parameter 1 from clauses (e.g. 'Soleplate Temperature Measurement (Max 250°C)')",
    "Specific lab testing parameter 2 from clauses (e.g. 'Leakage Current Measurement at Working Temp (Max 0.75mA)')",
    "Specific lab testing parameter 3 from clauses (e.g. 'Cord Flexing Endurance Test (20,000 cycles, 10N)')"
  ],
  "clauseReferences": [
    {
      "clause": "Clause X.Y",
      "description": "Exact clause specification details and performance limits from the text"
    }
  ]
}`;

  for (const model of modelCandidates) {
    try {
      const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      let rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawJson && typeof rawJson === 'string') {
        rawJson = rawJson.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(rawJson);

        if (parsed.isNumber || parsed.title) {
          const isNum = (parsed.isNumber || baselineStandard.isNumber).trim().toUpperCase();
          const title = (parsed.title || baselineStandard.title).trim();

          const clauses = Array.isArray(parsed.clauseReferences) && parsed.clauseReferences.length > 0
            ? parsed.clauseReferences.map((c: any) => ({
                clause: c.clause || 'Clause',
                description: c.description || 'Compliance specification.'
              }))
            : baselineStandard.clauseReferences;

          const keyReqs = Array.isArray(parsed.keyRequirements) && parsed.keyRequirements.length > 0
            ? parsed.keyRequirements.map((r: any) => String(r).trim()).filter(Boolean)
            : baselineStandard.keyRequirements;

          const testParams = Array.isArray(parsed.testingParameters) && parsed.testingParameters.length > 0
            ? parsed.testingParameters.map((t: any) => String(t).trim()).filter(Boolean)
            : baselineStandard.testingParameters;

          const reqDocs = Array.isArray(parsed.requiredDocuments) && parsed.requiredDocuments.length > 0
            ? parsed.requiredDocuments.map((d: any) => String(d).trim()).filter(Boolean)
            : baselineStandard.requiredDocuments;

          const targetAud = Array.isArray(parsed.targetAudience) && parsed.targetAudience.length > 0
            ? parsed.targetAudience.map((a: any) => String(a).trim()).filter(Boolean)
            : baselineStandard.targetAudience;

          // Build publication-grade Markdown if document content is plain text
          let md = documentContent;
          if (!md.startsWith('#')) {
            md = `# ${isNum}: ${title}\n\n**Category:** ${parsed.category || baselineStandard.category}  \n**Applicable Scheme:** ${parsed.applicableScheme || baselineStandard.applicableScheme}  \n**Status:** ${parsed.mandatoryStatus || baselineStandard.mandatoryStatus}  \n\n## 1. Scope & Field of Application\n${parsed.scope || baselineStandard.scope}\n\n## 2. Key Technical Requirements\n${keyReqs.map((r: string) => `- ${r}`).join('\n')}\n\n## 3. Mandatory Testing Parameters\n${testParams.map((t: string) => `- **${t}**`).join('\n')}\n\n## 4. Clause Breakdown\n| Clause | Description |\n| :--- | :--- |\n${clauses.map((c: any) => `| **${c.clause}** | ${c.description} |`).join('\n')}\n\n---\n\n## 5. Complete Extracted Text\n${documentContent}`;
          }

          return {
            id: baselineStandard.id,
            isNumber: isNum,
            title: title,
            category: parsed.category || baselineStandard.category,
            scope: parsed.scope || baselineStandard.scope,
            applicableScheme: parsed.applicableScheme || baselineStandard.applicableScheme,
            mandatoryStatus: parsed.mandatoryStatus || baselineStandard.mandatoryStatus,
            targetAudience: targetAud,
            keyRequirements: keyReqs,
            requiredDocuments: reqDocs,
            testingParameters: testParams,
            clauseReferences: clauses,
            officialUrl: parsed.officialUrl || baselineStandard.officialUrl || "https://www.services.bis.gov.in",
            lastUpdated: new Date().toISOString().split('T')[0] + " (AI Context Extraction)",
            rawDocumentText: documentContent,
            markdownContent: md
          };
        }
      }
    } catch (err) {
      console.warn(`AI analysis candidate ${model} failed, trying next candidate:`, err);
    }
  }

  return baselineStandard;
}
