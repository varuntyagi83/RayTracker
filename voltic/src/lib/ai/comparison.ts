import { getOpenAIClient } from "./openai";
import type { ComparisonAdInput, ComparisonResult } from "@/types/discover";

const SYSTEM_PROMPT = `You are an expert digital advertising strategist specializing in Meta (Facebook/Instagram) ads analysis. You are comparing 2-4 ads from different brands to determine which performs best and why.

Respond ONLY with valid JSON matching this exact schema:
{
  "ads": [
    {
      "brandName": string,
      "hookType": string,
      "copyFramework": string,
      "creativeStrategy": string,
      "targetAudience": string,
      "strengths": [string],
      "weaknesses": [string],
      "performanceScore": number
    }
  ],
  "winner": {
    "brandName": string,
    "adId": string,
    "rationale": string
  },
  "comparativeInsights": {
    "hookComparison": string,
    "copyComparison": string,
    "audienceOverlap": string,
    "creativeStrategyComparison": string
  },
  "recommendations": [string],
  "summary": string
}

Field guidelines:
- ads: One entry per ad in the same order as provided. Each must have a distinct performanceScore.
- performanceScore: 1-10. Use the FULL range critically:
  * 1-3: Weak — generic copy, no clear hook, unclear value prop
  * 4-5: Average — functional but unremarkable
  * 6-7: Good — solid fundamentals, clear hook and CTA
  * 8-9: Excellent — strong hook, compelling copy, multiple persuasion layers
  * 10: World-class — virtually flawless
  Differentiate scores clearly. Do NOT give similar scores unless ads are truly equivalent.
- strengths: 2-3 specific effectiveness factors per ad
- weaknesses: 2-3 specific shortcomings per ad
- winner.adId: The id of the winning ad (provided in the input)
- winner.rationale: 2-3 sentences explaining WHY this ad wins, citing specific elements
- comparativeInsights: Each field should be 1-2 sentences directly contrasting the ads
- recommendations: 3-5 actionable takeaways the user can apply to their own ads
- summary: 2-3 sentence executive summary of the comparison`;

export async function generateAdComparison(
  ads: ComparisonAdInput[]
): Promise<ComparisonResult> {
  const client = getOpenAIClient();

  const userPrompt = buildComparisonPrompt(ads);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as ComparisonResult;
}

function buildComparisonPrompt(ads: ComparisonAdInput[]): string {
  const parts: string[] = [
    `Compare the following ${ads.length} Meta ads from different brands. Analyze each individually, then declare a winner and explain why.`,
    "",
  ];

  ads.forEach((ad, index) => {
    parts.push(`--- Ad ${index + 1} (id: ${ad.id}) ---`);
    parts.push(`**Brand:** ${ad.pageName}`);
    parts.push(`**Headline:** ${ad.headline || "(none)"}`);
    parts.push(`**Body Copy:** ${ad.bodyText || "(none)"}`);
    parts.push(`**Format:** ${ad.mediaType}`);
    parts.push(`**Platforms:** ${ad.platforms.join(", ")}`);
    if (ad.linkUrl) parts.push(`**Landing Page URL:** ${ad.linkUrl}`);
    if (ad.runtimeDays) parts.push(`**Running for:** ${ad.runtimeDays} days`);
    parts.push(`**Status:** ${ad.isActive ? "Currently active" : "No longer running"}`);
    parts.push("");
  });

  parts.push("Provide your comparative analysis as JSON.");
  return parts.join("\n");
}
