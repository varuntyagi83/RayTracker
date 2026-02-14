import { generateText } from "ai";
import { getModel } from "./providers";
import type { LLMProvider } from "@/types/creative-studio";
import type { GeneratedBrandGuidelines } from "@/types/brand-guidelines";

const SYSTEM_PROMPT = `You are a world-class brand strategist and designer. Analyze the provided brand images and materials to extract comprehensive brand guidelines.

Your task is to identify and articulate:
1. Brand Name — The name of the brand if visible
2. Brand Voice — Tone, personality, writing style (e.g., "Bold, playful, conversational")
3. Color Palette — Extract dominant and accent colors as hex codes with descriptive names
4. Typography — Identify font styles and hierarchy patterns
5. Target Audience — Who these materials seem designed for
6. Do's and Don'ts — Brand usage rules based on the visual patterns

Return ONLY valid JSON matching this exact schema:
{
  "brandName": "string",
  "brandVoice": "string (2-3 sentences describing voice and tone)",
  "colorPalette": [{"hex": "#HEXCODE", "name": "Color Name"}],
  "typography": {"headingFont": "string", "bodyFont": "string", "sizes": {"h1": "string", "h2": "string", "body": "string"}},
  "targetAudience": "string (2-3 sentences)",
  "dosAndDonts": "string (bullet points with Do: and Don't: prefixes)"
}

Be specific with colors — extract actual hex values from the images. If you can't determine an exact value, make your best estimate based on what you see. Always include at least 3-5 colors.`;

export async function generateBrandGuidelinesFromMedia(params: {
  provider: LLMProvider;
  model: string;
  imageUrls: string[];
  existingName?: string;
}): Promise<GeneratedBrandGuidelines> {
  const { provider, model: modelId, imageUrls, existingName } = params;

  const userContent: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];

  if (existingName) {
    userContent.push({
      type: "text",
      text: `The brand is called "${existingName}". Analyze the following brand materials:`,
    });
  } else {
    userContent.push({
      type: "text",
      text: "Analyze the following brand materials and extract comprehensive brand guidelines:",
    });
  }

  for (const url of imageUrls) {
    userContent.push({ type: "image", image: new URL(url) });
  }

  const result = await generateText({
    model: getModel(provider, modelId),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  // Parse the JSON response
  const text = result.text.trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Failed to extract JSON from AI response");
  }

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  return {
    brandName: parsed.brandName ?? existingName ?? "Untitled Brand",
    brandVoice: parsed.brandVoice ?? "",
    colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
    typography: parsed.typography ?? {},
    targetAudience: parsed.targetAudience ?? "",
    dosAndDonts: parsed.dosAndDonts ?? "",
  };
}
