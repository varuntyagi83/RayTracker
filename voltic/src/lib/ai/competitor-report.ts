import { getOpenAIClient } from "./openai";
import type { CompetitorAd } from "@/types/competitors";
import type { CompetitorAdAnalysis, CrossBrandSummary } from "@/types/competitors";

const MAX_ADS = 50;

const SYSTEM_PROMPT = `You are an expert digital advertising strategist specializing in Meta (Facebook/Instagram) competitive analysis. You analyze multiple competitor ads across brands and provide a comprehensive intelligence report.

Respond ONLY with valid JSON matching this exact schema:
{
  "perAdAnalyses": [
    {
      "adId": string,
      "metaLibraryId": string,
      "brandName": string,
      "headline": string,
      "bodyText": string,
      "format": string,
      "hookType": string,
      "hookExplanation": string,
      "ctaType": string,
      "ctaAnalysis": string,
      "targetAudience": {
        "primary": string,
        "interests": [string],
        "painPoints": [string]
      },
      "copyStructure": {
        "framework": string,
        "structure": string,
        "headlineFormula": string
      },
      "strengths": [string],
      "weaknesses": [string],
      "improvements": [string],
      "estimatedClicksRange": { "low": number, "high": number },
      "estimatedROAS": { "low": number, "high": number },
      "estimatedTargetGroup": string,
      "performanceScore": number,
      "performanceRationale": string
    }
  ],
  "crossBrandSummary": {
    "commonPatterns": [string],
    "bestPractices": [string],
    "gapsAndOpportunities": [string],
    "marketPositioning": string,
    "overallRecommendations": [string]
  }
}

Field guidelines for perAdAnalyses (one entry per ad, preserve input order):
- hookType: e.g. "Question Hook", "Bold Claim", "Social Proof", "FOMO", "Curiosity Gap", "Before/After", "Storytelling"
- hookExplanation: 1-2 sentences explaining how the hook grabs attention
- ctaType: e.g. "Direct CTA", "Soft CTA", "Urgency CTA", "Value-First CTA", "Social Proof CTA"
- ctaAnalysis: 1-2 sentences on CTA effectiveness
- targetAudience.primary: Specific demographic, e.g. "Health-conscious millennials aged 25-34"
- targetAudience.interests: 3-5 inferred interest categories
- targetAudience.painPoints: 2-3 pain points the ad addresses
- copyStructure.framework: e.g. "AIDA", "PAS", "BAB", "FAB", "4Ps", "Feature-Benefit"
- copyStructure.structure: Brief description of how the copy flows
- copyStructure.headlineFormula: e.g. "Benefit + Urgency", "Problem-Solution"
- strengths: 3-5 specific things making this ad effective
- weaknesses: 2-4 specific shortcomings
- improvements: 3-5 actionable improvement suggestions
- estimatedClicksRange: Estimated daily clicks as a range {low, high} based on ad quality and format
- estimatedROAS: Estimated return-on-ad-spend range {low, high}. Use 0.0-10.0 scale.
- estimatedTargetGroup: One sentence describing the core target, e.g. "Female fitness enthusiasts 25-40 in urban areas"
- performanceScore: 1-10. Use the FULL range critically:
  * 1-3: Weak — generic copy, no clear hook, unclear value prop
  * 4-5: Average — functional but unremarkable
  * 6-7: Good — solid fundamentals, clear hook and CTA
  * 8-9: Excellent — strong hook, compelling copy, multiple persuasion layers
  * 10: World-class — virtually flawless
  Most ads should score 4-7. Be critical and differentiate.
- performanceRationale: Brief explanation citing specific weaknesses preventing a higher score

Cross-brand summary guidelines:
- commonPatterns: 3-5 patterns observed across all competitor ads
- bestPractices: 3-5 things the best-performing ads do well that should be emulated
- gapsAndOpportunities: 3-5 areas where competitors are weak and the user could differentiate
- marketPositioning: 2-3 sentences on how competitors position themselves relative to each other
- overallRecommendations: 5-7 actionable takeaways the user can apply to beat these competitors`;

export interface CompetitorReportResult {
  perAdAnalyses: CompetitorAdAnalysis[];
  crossBrandSummary: CrossBrandSummary;
}

export async function generateCompetitorReport(
  ads: CompetitorAd[],
  brandNames: string[]
): Promise<CompetitorReportResult> {
  if (ads.length === 0) {
    throw new Error("No ads provided for analysis");
  }

  const limitedAds = ads.slice(0, MAX_ADS);
  const client = getOpenAIClient();
  const userPrompt = buildReportPrompt(limitedAds, brandNames);

  // Scale max tokens: base 3000 + 1500 per ad, capped at 16000
  const maxTokens = Math.min(3000 + limitedAds.length * 1500, 16000);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(content) as CompetitorReportResult;
  return parsed;
}

function buildReportPrompt(
  ads: CompetitorAd[],
  brandNames: string[]
): string {
  const parts: string[] = [
    `Analyze the following ${ads.length} Meta ads from ${brandNames.length} competitor brand(s): ${brandNames.join(", ")}.`,
    "Provide detailed per-ad analysis and a cross-brand summary with competitive intelligence.",
    "",
  ];

  ads.forEach((ad, index) => {
    parts.push(`--- Ad ${index + 1} (id: ${ad.id}, metaLibraryId: ${ad.metaLibraryId}) ---`);
    parts.push(`**Brand:** ${ad.competitorBrandId}`);
    parts.push(`**Headline:** ${ad.headline || "(none)"}`);
    parts.push(`**Body Copy:** ${ad.bodyText || "(none)"}`);
    parts.push(`**Format:** ${ad.format}`);
    parts.push(`**Platforms:** ${(ad.platforms || []).join(", ") || "unknown"}`);
    if (ad.landingPageUrl) parts.push(`**Landing Page:** ${ad.landingPageUrl}`);
    if (ad.runtimeDays) parts.push(`**Running for:** ${ad.runtimeDays} days`);
    parts.push(`**Status:** ${ad.isActive ? "Currently active" : "No longer running"}`);
    parts.push("");
  });

  parts.push("Provide your comprehensive competitive analysis as JSON.");
  return parts.join("\n");
}
