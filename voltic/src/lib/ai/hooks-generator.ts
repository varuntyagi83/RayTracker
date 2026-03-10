// ─── Hooks Matrix Generation Service ─────────────────────────────────────────
// Generates a competitive hooks matrix by synthesizing competitor video analyses
// and producing tailored hook copy, creative briefs, and strategic insights.

import type { VideoAnalysisResult } from "./video-analysis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HookEntry {
  competitor_reference: string;
  hook_type: string;
  hook_text: string;
  rationale: string;
  target_emotion: string;
  suggested_format: "IMAGE" | "VIDEO" | "CAROUSEL";
}

export interface CreativeBrief {
  title: string;
  hook: string;
  body: string;
  cta: string;
  format: string;
  visual_direction: string;
  competitor_inspiration: string;
}

export interface CompetitiveInsights {
  summary: string;
  patterns: string[];
  gaps: string[];
  recommendations: string[];
}

export interface HooksMatrixResult {
  hooks: HookEntry[];
  creative_briefs: CreativeBrief[];
  competitive_insights: CompetitiveInsights;
}

export type HookStrategy =
  | "curiosity"
  | "pain_point"
  | "social_proof"
  | "urgency"
  | "contrarian"
  | "authority"
  | "storytelling"
  | "statistic";

// ─── Competitor Summary Builder ───────────────────────────────────────────────

/**
 * Converts an array of competitor analyses into a readable summary block
 * suitable for inclusion in the generation prompt.
 */
function buildCompetitorSummary(
  competitorAnalyses: Array<{
    brand: string;
    videos: VideoAnalysisResult[];
  }>
): string {
  const lines: string[] = [];

  for (const competitor of competitorAnalyses) {
    lines.push(`### ${competitor.brand}`);
    lines.push(`Videos analyzed: ${competitor.videos.length}`);
    lines.push("");

    competitor.videos.forEach((video, index) => {
      lines.push(`**Ad #${index + 1}**`);
      lines.push(
        `- Hook: "${video.hook.text}" (type: ${video.hook.type}, strength: ${video.hook.strength}, score: ${video.hook.scroll_stop_score}/10)`
      );
      lines.push(
        `- Narrative: ${video.narrative.structure} | Pacing: ${video.narrative.pacing} | Est. duration: ${video.narrative.estimated_duration}s`
      );
      lines.push(
        `- CTA: "${video.cta.text}" (placement: ${video.cta.placement})`
      );
      lines.push(
        `- Brand tone: ${video.brand_elements.tone} | Product shown: ${video.brand_elements.product_shown}`
      );

      if (video.text_overlays.length > 0) {
        const overlayTexts = video.text_overlays
          .slice(0, 5)
          .map((o) => `"${o.text}" (${o.type})`)
          .join(", ");
        lines.push(`- Key text overlays: ${overlayTexts}`);
      }

      lines.push(`- Insight: ${video.competitive_insight}`);
      lines.push("");
    });
  }

  return lines.join("\n");
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildGenerationPrompt(params: {
  competitorAnalyses: Array<{
    brand: string;
    videos: VideoAnalysisResult[];
  }>;
  yourBrand: {
    name: string;
    product_description: string;
    target_audience?: string;
    brand_voice?: string;
    dos_and_donts?: string;
  };
  hookCount: number;
  strategies: HookStrategy[];
}): string {
  const { competitorAnalyses, yourBrand, hookCount, strategies } = params;

  const totalVideos = competitorAnalyses.reduce((sum, c) => sum + c.videos.length, 0);
  const brandNames = competitorAnalyses.map((c) => c.brand).join(", ");
  const competitorSummary = buildCompetitorSummary(competitorAnalyses);

  return `You are an elite performance marketing creative strategist. You have analyzed ${totalVideos} video ads across ${brandNames}.

COMPETITOR VIDEO ANALYSES:
${competitorSummary}

YOUR BRAND: ${yourBrand.name}
Product: ${yourBrand.product_description}
Target Audience: ${yourBrand.target_audience ?? "Not specified"}
${yourBrand.brand_voice ? `Brand Voice: ${yourBrand.brand_voice}` : ""}
${yourBrand.dos_and_donts ? `Dos and Don'ts: ${yourBrand.dos_and_donts}` : ""}

Generate ${hookCount} hooks for ${yourBrand.name} across these strategies: ${strategies.join(", ")}.

For each hook, provide:
- competitor_reference: which competitor's approach inspired this (e.g. "${brandNames.split(",")[0].trim()}")
- hook_type: the copywriting strategy type
- hook_text: the actual hook copy written for ${yourBrand.name} (NOT the competitor's copy)
- rationale: 1-2 sentences on why this works
- target_emotion: the primary emotion targeted
- suggested_format: IMAGE, VIDEO, or CAROUSEL

Also generate exactly 5 creative_briefs with: title, hook, body, cta, format, visual_direction, competitor_inspiration.

And provide competitive_insights with: summary (2-3 sentences), patterns (array of strings), gaps (array of strings), recommendations (array of strings).

Return ONLY valid JSON with keys: hooks (array), creative_briefs (array), competitive_insights (object).

JSON structure:
{
  "hooks": [
    {
      "competitor_reference": "Brand Name",
      "hook_type": "curiosity",
      "hook_text": "actual hook copy for ${yourBrand.name}",
      "rationale": "why this hook works for this audience",
      "target_emotion": "curiosity",
      "suggested_format": "VIDEO"
    }
  ],
  "creative_briefs": [
    {
      "title": "Brief title",
      "hook": "opening hook line",
      "body": "body copy for the ad",
      "cta": "call to action text",
      "format": "VIDEO",
      "visual_direction": "description of the visual approach",
      "competitor_inspiration": "Brand Name — what you borrowed and adapted"
    }
  ],
  "competitive_insights": {
    "summary": "2-3 sentence overview of the competitive landscape",
    "patterns": ["pattern 1", "pattern 2"],
    "gaps": ["gap 1", "gap 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  }
}`;
}

// ─── OpenAI API Call ──────────────────────────────────────────────────────────

async function callOpenAIForHooks(prompt: string): Promise<HooksMatrixResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an elite performance marketing creative strategist specializing in Meta advertising. You generate high-converting ad hooks and creative briefs backed by competitive intelligence. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenAI API request failed for hooks generation: ${msg}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: HTTP ${response.status} — ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any;
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response for hooks generation");
  }

  let parsed: HooksMatrixResult;
  try {
    parsed = JSON.parse(content) as HooksMatrixResult;
  } catch {
    throw new Error("GPT-4o returned malformed JSON for hooks matrix — please retry");
  }

  // Validate the required top-level structure
  if (!Array.isArray(parsed.hooks) || parsed.hooks.length === 0) {
    throw new Error(
      "Hooks matrix result is missing or empty — expected a non-empty 'hooks' array"
    );
  }
  if (!Array.isArray(parsed.creative_briefs)) {
    throw new Error("Hooks matrix result is missing required field: creative_briefs");
  }
  if (!parsed.competitive_insights) {
    throw new Error("Hooks matrix result is missing required field: competitive_insights");
  }

  return parsed;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a competitive hooks matrix by analyzing competitor video ads and
 * producing tailored hook copy, creative briefs, and strategic insights for
 * the specified brand.
 *
 * The function synthesizes all competitor analyses into a structured prompt and
 * calls GPT-4o (temperature 0.7 for creative output) to generate:
 * - `hookCount` hooks across the specified strategies
 * - 5 creative briefs with full ad copy direction
 * - Competitive insights including patterns, gaps, and recommendations
 */
export async function generateHooksMatrix(params: {
  competitorAnalyses: Array<{
    brand: string;
    videos: VideoAnalysisResult[];
  }>;
  yourBrand: {
    name: string;
    product_description: string;
    target_audience?: string;
    brand_voice?: string;
    dos_and_donts?: string;
  };
  hookCount: number;
  strategies: HookStrategy[];
}): Promise<HooksMatrixResult> {
  const { competitorAnalyses, yourBrand, hookCount, strategies } = params;

  if (competitorAnalyses.length === 0) {
    throw new Error(
      "At least one competitor analysis is required to generate a hooks matrix"
    );
  }

  if (hookCount < 1) {
    throw new Error(`hookCount must be at least 1 — received: ${hookCount}`);
  }

  if (strategies.length === 0) {
    throw new Error("At least one hook strategy must be specified");
  }

  const totalVideos = competitorAnalyses.reduce((sum, c) => sum + c.videos.length, 0);
  if (totalVideos === 0) {
    throw new Error(
      "Competitor analyses contain no video results — run video analysis first"
    );
  }

  const prompt = buildGenerationPrompt({ competitorAnalyses, yourBrand, hookCount, strategies });

  return callOpenAIForHooks(prompt);
}
