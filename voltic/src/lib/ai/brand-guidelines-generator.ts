import { generateText } from "ai";
import { getModel } from "./providers";
import type { LLMProvider } from "@/types/creative-studio";
import type { GeneratedBrandGuidelines } from "@/types/brand-guidelines";

const SYSTEM_PROMPT = `You are a senior brand identity strategist and visual designer with 20 years of experience creating brand books for Fortune 500 companies and premium DTC brands. You are tasked with reverse-engineering a comprehensive brand guidelines document from provided visual materials.

Analyze every pixel of the provided images with extreme precision. Examine packaging, product photography, advertising creative, social media assets, website screenshots, logos, labels, and any other brand materials present.

─── ANALYSIS FRAMEWORK ───

1. BRAND NAME
   Identify the brand name exactly as it appears in the materials — including capitalization, spacing, and any stylized treatment (e.g., "sunday" lowercase, "SUNDAY" uppercase, "Sunday Natural").

2. BRAND VOICE & PERSONALITY
   Determine the brand's communication identity by analyzing copy, taglines, label text, product descriptions, and overall visual language. Address:
   • Voice attributes — the 3-5 adjectives that define how the brand speaks (e.g., "clinical yet approachable", "premium and understated")
   • Tone spectrum — where the brand sits on formal ↔ casual, serious ↔ playful, authoritative ↔ friendly
   • Messaging pillars — the core themes the brand communicates (e.g., transparency, scientific rigor, sustainability)
   • Language register — vocabulary complexity, sentence structure, use of technical vs. plain language
   • Brand archetype — the archetypal persona (e.g., The Sage, The Explorer, The Creator)
   Write this as 4-6 rich sentences covering all the above.

3. COLOR PALETTE
   Extract the complete color system using the visual hierarchy present in the materials:
   • Primary color(s) — the dominant brand color(s) that appear most frequently
   • Secondary color(s) — supporting colors used for accents, CTAs, or complementary elements
   • Neutral palette — background tones, text colors, and structural grays/whites/blacks
   • Accent/highlight color(s) — used sparingly for emphasis or differentiation
   Give each color a descriptive, brand-appropriate name (e.g., "Honey Amber" not "Orange", "Forest Charcoal" not "Dark Green"). Extract accurate hex values by pixel-sampling the most representative area of each color. Include 6-10 colors minimum.

4. TYPOGRAPHY
   Identify the typographic system from all visible text in the materials:
   • Heading/display typeface — font family, weight, and style (e.g., "Sans-serif, likely Futura or geometric grotesque, bold weight")
   • Body/secondary typeface — font family used for descriptions, ingredients, or supporting text
   • Type scale and hierarchy — describe the size relationships between H1 (product names, hero headlines), H2 (section headers, subheadings), H3 (category labels, captions), and body text
   • Stylistic notes — letter-spacing/tracking (tight, normal, loose), case treatment (sentence case, title case, all-caps for certain elements), line-height characteristics
   • Special typographic treatments — any custom lettering, script elements, or distinctive type usage

5. TARGET AUDIENCE
   Build a detailed audience profile by reverse-engineering who the brand's visual and verbal identity is designed to attract:
   • Demographics — age range, gender skew, income bracket, education level
   • Psychographics — values, lifestyle, aspirations, media consumption habits
   • Behavioral patterns — purchase motivations, brand relationship style, decision drivers
   • Market positioning — premium/mass-market, niche/broad, what competing brands share this audience
   Write this as 4-6 detailed sentences.

6. DO'S AND DON'TS
   Infer brand usage rules from the visual consistency (or inconsistency) across all provided materials. Be specific and actionable:
   • Do's: at least 5-7 rules covering layout, color usage, photography style, typography treatment, white space, product presentation, label hierarchy, imagery mood, texture/material choices
   • Don'ts: at least 5-7 corresponding anti-patterns — what would break the brand's visual integrity
   Format each rule on its own line prefixed with "Do: " or "Don't: " separated by bullet characters (•).

─── OUTPUT FORMAT ───

Return ONLY valid JSON matching this exact schema — no markdown fences, no explanation outside the JSON:
{
  "brandName": "string",
  "brandVoice": "string (4-6 sentences covering voice attributes, tone, messaging pillars, archetype)",
  "colorPalette": [
    {"hex": "#HEXCODE", "name": "Descriptive Color Name"}
  ],
  "typography": {
    "headingFont": "string (font identification + weight + stylistic notes)",
    "bodyFont": "string (font identification + weight + stylistic notes)",
    "sizes": {
      "h1": "string (usage context + relative size + weight + tracking)",
      "h2": "string (usage context + relative size + weight)",
      "h3": "string (usage context + relative size + weight)",
      "body": "string (usage context + size characteristics + line-height)",
      "caption": "string (usage context + size + special treatments)"
    }
  },
  "targetAudience": "string (4-6 sentences covering demographics, psychographics, behavior, positioning)",
  "dosAndDonts": "Do: rule one • Do: rule two • Don't: rule one • Don't: rule two"
}

─── CRITICAL RULES ───
• Extract hex values with precision — pixel-sample dominant areas, not edge artifacts or shadows.
• Include 6-10 colors minimum spanning the full palette (primaries, secondaries, neutrals, accents).
• Every "sizes" entry should describe the USAGE CONTEXT, not just "large" or "small".
• Do's and Don'ts must be separated by • (bullet) characters, each prefixed with "Do: " or "Don't: ".
• Be opinionated and specific — vague guidelines are useless. "Maintain generous white space with at least 20% negative space around key elements" is better than "Use white space".`;

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
