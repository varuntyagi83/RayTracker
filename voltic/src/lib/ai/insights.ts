import { getOpenAIClient } from "./openai";
import type { AdInsightData, AdInsightInput } from "@/types/discover";

const SYSTEM_PROMPT = `You are an expert digital advertising strategist specializing in Meta (Facebook/Instagram) ads analysis. You analyze competitor ads and provide actionable insights for marketers.

Respond ONLY with valid JSON matching this exact schema:
{
  "hookType": string,
  "hookExplanation": string,
  "copyStructure": {
    "headlineFormula": string,
    "bodyFramework": string,
    "ctaType": string
  },
  "creativeStrategy": string,
  "targetAudience": {
    "primary": string,
    "interests": [string],
    "painPoints": [string]
  },
  "strengths": [string],
  "performanceScore": number,
  "performanceRationale": string,
  "improvements": [string]
}

Field guidelines:
- hookType: e.g. "Question Hook", "Bold Claim", "Social Proof", "FOMO", "Curiosity Gap", "Before/After", "Storytelling"
- hookExplanation: 1-2 sentences explaining how the hook grabs attention
- copyStructure.headlineFormula: e.g. "Benefit + Urgency", "Problem-Solution", "Social Proof + CTA"
- copyStructure.bodyFramework: e.g. "AIDA", "PAS", "BAB", "FAB", "4Ps", "Feature-Benefit"
- copyStructure.ctaType: e.g. "Direct CTA", "Soft CTA", "Urgency CTA", "Value-First CTA"
- creativeStrategy: Primary persuasion technique, e.g. "Scarcity", "Authority", "Social Proof", "Reciprocity", "Emotional Appeal"
- targetAudience.primary: Specific demographic description, e.g. "Health-conscious millennials aged 25-34"
- targetAudience.interests: 3-5 inferred interest categories
- targetAudience.painPoints: 2-3 pain points the ad addresses
- strengths: 3-5 specific things that make this ad effective
- performanceScore: 1-10 estimated effectiveness score
- performanceRationale: Brief explanation of the score
- improvements: 3-5 specific, actionable improvement suggestions`;

export async function generateAdInsights(
  input: AdInsightInput
): Promise<AdInsightData> {
  const client = getOpenAIClient();

  const userPrompt = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  return JSON.parse(content) as AdInsightData;
}

function buildUserPrompt(input: AdInsightInput): string {
  const parts: string[] = [
    "Analyze this Meta ad and provide detailed marketing insights:",
    "",
    `**Brand:** ${input.brandName}`,
    `**Headline:** ${input.headline || "(none)"}`,
    `**Body Copy:** ${input.bodyText || "(none)"}`,
    `**Format:** ${input.format}`,
    `**Platforms:** ${input.platforms.join(", ")}`,
  ];

  if (input.landingPageUrl) {
    parts.push(`**Landing Page URL:** ${input.landingPageUrl}`);
  }

  if (input.runtimeDays) {
    parts.push(`**Running for:** ${input.runtimeDays} days (longer runtime suggests good performance)`);
  }

  if (input.isActive) {
    parts.push("**Status:** Currently active (still running)");
  }

  parts.push("", "Provide your analysis as JSON.");

  return parts.join("\n");
}
