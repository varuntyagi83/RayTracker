import { getOpenAIClient } from "./openai";
import type { BrandGuidelines } from "@/types/variations";

const SYSTEM_PROMPT = `You are a world-class direct-response copywriter specializing in Meta (Facebook/Instagram) ad copy. Your task is to improve provided ad copy — make it more compelling, persuasive, and conversion-focused.

Respond ONLY with valid JSON matching this schema:
{
  "headline": string,
  "body": string
}

Rules:
- Keep the core message and intent of the original copy.
- Make the headline punchier, more attention-grabbing (5-12 words).
- Improve the body copy with stronger value propositions, clearer CTAs, and more persuasive language (2-4 sentences).
- If brand guidelines are provided, strictly follow the brand voice, tone, and rules.
- Never use placeholder text or generic filler.`;

export async function enhanceCreativeText(
  headline: string,
  body: string,
  brandGuidelines?: BrandGuidelines
): Promise<{ headline: string; body: string }> {
  const client = getOpenAIClient();

  const parts: string[] = [
    "Improve this ad copy. Keep the core message but make it more compelling and conversion-focused.",
    "",
    `Original Headline: ${headline}`,
    `Original Body: ${body}`,
  ];

  if (brandGuidelines) {
    const guidelineParts: string[] = [];
    if (brandGuidelines.brandName) guidelineParts.push(`Brand Name: ${brandGuidelines.brandName}`);
    if (brandGuidelines.brandVoice) guidelineParts.push(`Brand Voice: ${brandGuidelines.brandVoice}`);
    if (brandGuidelines.targetAudience) guidelineParts.push(`Target Audience: ${brandGuidelines.targetAudience}`);
    if (brandGuidelines.dosAndDonts) guidelineParts.push(`Guidelines: ${brandGuidelines.dosAndDonts}`);

    if (guidelineParts.length > 0) {
      parts.push("", "--- BRAND GUIDELINES (must follow) ---", ...guidelineParts);
    }
  }

  parts.push("", "Return the improved copy as JSON.");

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parts.join("\n") },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return JSON.parse(content) as { headline: string; body: string };
}
