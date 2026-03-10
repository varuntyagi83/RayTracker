// ─── Video Ad Analysis Service ────────────────────────────────────────────────
// Uses Gemini 2.0 Flash (primary) and optionally GPT-4o (refinement) to
// analyze video advertisements and extract structured marketing intelligence.

// ─── Types ────────────────────────────────────────────────────────────────────

export type HookType =
  | "curiosity"
  | "pain_point"
  | "social_proof"
  | "urgency"
  | "contrarian"
  | "authority"
  | "storytelling"
  | "shock"
  | "question"
  | "statistic";

export type NarrativeStructure =
  | "problem_solution"
  | "testimonial"
  | "demonstration"
  | "before_after"
  | "listicle"
  | "story_arc"
  | "ugc_style";

export interface VideoAnalysisResult {
  hook: {
    text: string;
    type: HookType;
    strength: "strong" | "medium" | "weak";
    scroll_stop_score: number; // 1-10
  };
  narrative: {
    structure: NarrativeStructure;
    scenes: Array<{
      timestamp_start: number;
      timestamp_end: number;
      description: string;
      text_on_screen: string | null;
      scene_type: "hook" | "problem" | "solution" | "proof" | "cta" | "transition";
    }>;
    pacing: "fast" | "medium" | "slow";
    estimated_duration: number;
  };
  cta: {
    text: string;
    type: "shop_now" | "learn_more" | "sign_up" | "send_message" | "get_offer" | "custom";
    placement: "end" | "middle" | "throughout" | "button_only";
  };
  brand_elements: {
    logo_visible: boolean;
    product_shown: boolean;
    product_description: string;
    colors: string[];
    tone: "professional" | "casual" | "energetic" | "calm" | "urgent" | "humorous";
  };
  text_overlays: Array<{
    text: string;
    timestamp: number;
    type: "headline" | "subtitle" | "stat" | "testimonial" | "cta";
  }>;
  competitive_insight: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB

// Private IP ranges and localhost — blocked to prevent SSRF
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
];

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildQuickPrompt(brandName: string): string {
  return `You are an expert performance marketing analyst. Analyze this video advertisement for the brand "${brandName}" and extract:
1. The opening hook (first 3 seconds) — hook text, type, strength (strong/medium/weak), and scroll-stop score (1-10)
2. The primary CTA — text, type, and placement
3. Key text overlays (up to 5 most important)
4. A one-sentence competitive insight

Return ONLY valid JSON exactly matching this structure with no markdown or explanation:
{
  "hook": {
    "text": "exact hook text",
    "type": "curiosity|pain_point|social_proof|urgency|contrarian|authority|storytelling|shock|question|statistic",
    "strength": "strong|medium|weak",
    "scroll_stop_score": 7
  },
  "narrative": {
    "structure": "problem_solution|testimonial|demonstration|before_after|listicle|story_arc|ugc_style",
    "scenes": [
      {
        "timestamp_start": 0,
        "timestamp_end": 3,
        "description": "scene description",
        "text_on_screen": "text or null",
        "scene_type": "hook|problem|solution|proof|cta|transition"
      }
    ],
    "pacing": "fast|medium|slow",
    "estimated_duration": 30
  },
  "cta": {
    "text": "Shop Now",
    "type": "shop_now|learn_more|sign_up|send_message|get_offer|custom",
    "placement": "end|middle|throughout|button_only"
  },
  "brand_elements": {
    "logo_visible": true,
    "product_shown": true,
    "product_description": "description of product",
    "colors": ["#FFFFFF", "#000000"],
    "tone": "professional|casual|energetic|calm|urgent|humorous"
  },
  "text_overlays": [
    {
      "text": "overlay text",
      "timestamp": 1,
      "type": "headline|subtitle|stat|testimonial|cta"
    }
  ],
  "competitive_insight": "one-sentence insight"
}`;
}

function buildDetailedPrompt(brandName: string): string {
  return `You are an expert performance marketing analyst specializing in Meta ads creative strategy. Analyze this video advertisement for the brand "${brandName}" comprehensively:
1. Opening hook: text, type, strength (strong/medium/weak), scroll-stop score 1-10
2. Full narrative structure: identify the overall structure, list every scene with timestamp_start, timestamp_end, description, text_on_screen, and scene_type
3. CTA: all CTAs found, their placement
4. Brand elements: logo visibility, product visibility, product description, dominant colors (as hex), tone
5. All text overlays: every text element with timestamp and type
6. Competitive insight: 1-2 sentence strategic takeaway

Return ONLY valid JSON exactly matching the schema with no markdown:
{
  "hook": {
    "text": "exact hook text",
    "type": "curiosity|pain_point|social_proof|urgency|contrarian|authority|storytelling|shock|question|statistic",
    "strength": "strong|medium|weak",
    "scroll_stop_score": 7
  },
  "narrative": {
    "structure": "problem_solution|testimonial|demonstration|before_after|listicle|story_arc|ugc_style",
    "scenes": [
      {
        "timestamp_start": 0,
        "timestamp_end": 3,
        "description": "detailed scene description",
        "text_on_screen": "text or null",
        "scene_type": "hook|problem|solution|proof|cta|transition"
      }
    ],
    "pacing": "fast|medium|slow",
    "estimated_duration": 30
  },
  "cta": {
    "text": "primary CTA text",
    "type": "shop_now|learn_more|sign_up|send_message|get_offer|custom",
    "placement": "end|middle|throughout|button_only"
  },
  "brand_elements": {
    "logo_visible": true,
    "product_shown": true,
    "product_description": "detailed product description",
    "colors": ["#FFFFFF", "#000000"],
    "tone": "professional|casual|energetic|calm|urgent|humorous"
  },
  "text_overlays": [
    {
      "text": "overlay text",
      "timestamp": 1,
      "type": "headline|subtitle|stat|testimonial|cta"
    }
  ],
  "competitive_insight": "1-2 sentence strategic takeaway"
}`;
}

function buildGPT4oRefinementPrompt(
  geminiAnalysis: VideoAnalysisResult,
  brandName: string
): string {
  return `You are an elite performance marketing strategist. Based on this AI video analysis, provide a refined expert analysis with deeper marketing insights. Focus especially on: hook psychology, emotional triggers, copywriting framework, and what makes this ad compete effectively.

Raw analysis:
${JSON.stringify(geminiAnalysis)}

Brand: ${brandName}

Improve the competitive_insight to be more strategic and actionable. Ensure hook type classification is correct. Return ONLY valid JSON matching the same schema.`;
}

// ─── URL Validation ───────────────────────────────────────────────────────────

function validateVideoUrl(videoUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    throw new Error(`Invalid video URL: ${videoUrl}`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`Video URL must use HTTPS — received: ${parsed.protocol}`);
  }

  const hostname = parsed.hostname;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new Error(
        `Video URL points to a private or local address which is not allowed: ${hostname}`
      );
    }
  }
}

// ─── Video Download ───────────────────────────────────────────────────────────

async function downloadVideo(videoUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  let response: Response;
  try {
    response = await fetch(videoUrl, {
      signal: AbortSignal.timeout(120_000),
      redirect: "error",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch video from URL: ${msg}`);
  }

  if (!response.ok) {
    throw new Error(`Video download failed — HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const mimeType = contentType.split(";")[0].trim() || "video/mp4";

  if (!mimeType.startsWith("video/")) {
    throw new Error(
      `URL does not point to a video file — received content-type: ${contentType}`
    );
  }

  // Pre-flight size check via Content-Length (when available)
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video exceeds the 20 MB size limit (reported ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)} MB). Use a shorter clip or lower-resolution video.`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video exceeds the 20 MB size limit (actual ${Math.round(arrayBuffer.byteLength / 1024 / 1024)} MB). Use a shorter clip or lower-resolution video.`
    );
  }

  const buffer = Buffer.from(arrayBuffer);
  return { buffer, mimeType };
}

// ─── Gemini API Call ──────────────────────────────────────────────────────────

async function callGeminiVideoAnalysis(
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<VideoAnalysisResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set");
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  };

  let response: Response;
  try {
    response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini API request failed: ${msg}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: HTTP ${response.status} — ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any;
  const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty response — the video may be too long or contain unsupported content"
    );
  }

  let parsed: VideoAnalysisResult;
  try {
    parsed = JSON.parse(rawText) as VideoAnalysisResult;
  } catch {
    throw new Error("Gemini returned malformed JSON for video analysis — please retry");
  }

  validateAnalysisResult(parsed);
  return parsed;
}

// ─── OpenAI API Call ──────────────────────────────────────────────────────────

async function callOpenAIRefinement(
  systemPrompt: string,
  userPrompt: string
): Promise<VideoAnalysisResult> {
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenAI API request failed: ${msg}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: HTTP ${response.status} — ${errText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await response.json()) as any;
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response for video analysis refinement");
  }

  let parsed: VideoAnalysisResult;
  try {
    parsed = JSON.parse(content) as VideoAnalysisResult;
  } catch {
    throw new Error("GPT-4o returned malformed JSON for video analysis — please retry");
  }

  validateAnalysisResult(parsed);
  return parsed;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAnalysisResult(result: VideoAnalysisResult): void {
  if (!result.hook) {
    throw new Error("Video analysis result is missing required field: hook");
  }
  if (!result.narrative) {
    throw new Error("Video analysis result is missing required field: narrative");
  }
  if (!result.cta) {
    throw new Error("Video analysis result is missing required field: cta");
  }
  if (!result.brand_elements) {
    throw new Error("Video analysis result is missing required field: brand_elements");
  }
  if (!Array.isArray(result.text_overlays)) {
    throw new Error("Video analysis result is missing required field: text_overlays");
  }
  if (!result.competitive_insight) {
    throw new Error("Video analysis result is missing required field: competitive_insight");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes a video advertisement using Gemini 2.0 Flash.
 * Downloads the video, converts it to base64, and sends it inline to the Gemini API.
 * Supports quick (hook + CTA only) and detailed (full scene breakdown) analysis modes.
 */
export async function analyzeVideoWithGemini(params: {
  videoUrl: string;
  brandName: string;
  analysisDepth: "quick" | "detailed";
}): Promise<VideoAnalysisResult> {
  const { videoUrl, brandName, analysisDepth } = params;

  validateVideoUrl(videoUrl);

  const { buffer, mimeType } = await downloadVideo(videoUrl);
  const base64Data = buffer.toString("base64");

  const prompt =
    analysisDepth === "quick"
      ? buildQuickPrompt(brandName)
      : buildDetailedPrompt(brandName);

  return callGeminiVideoAnalysis(base64Data, mimeType, prompt);
}

/**
 * Analyzes a video advertisement using a two-step pipeline:
 * 1. Gemini 2.0 Flash performs a quick video analysis (visual understanding)
 * 2. GPT-4o refines the analysis with deeper marketing copywriting insights
 *
 * The thumbnailUrl parameter is accepted for interface compatibility but the
 * primary analysis is driven by the full video via Gemini.
 */
export async function analyzeVideoWithGPT4o(params: {
  videoUrl: string;
  brandName: string;
  thumbnailUrl?: string | null;
}): Promise<VideoAnalysisResult> {
  const { videoUrl, brandName } = params;

  // Step 1: Use Gemini for the raw video analysis (vision capability)
  const geminiAnalysis = await analyzeVideoWithGemini({
    videoUrl,
    brandName,
    analysisDepth: "quick",
  });

  // Step 2: Refine with GPT-4o for deeper marketing strategy insight
  const systemPrompt =
    "You are an elite performance marketing strategist with deep expertise in Meta advertising creative analysis, consumer psychology, and direct-response copywriting.";

  const userPrompt = buildGPT4oRefinementPrompt(geminiAnalysis, brandName);

  return callOpenAIRefinement(systemPrompt, userPrompt);
}

/**
 * Top-level entry point for video ad analysis.
 * Routes to the appropriate provider based on the `provider` parameter.
 *
 * - 'gemini': Direct Gemini 2.0 Flash analysis (faster, lower cost)
 * - 'gpt4o': Two-step pipeline — Gemini vision + GPT-4o refinement (deeper insights)
 */
export async function analyzeVideoAd(params: {
  videoUrl: string;
  brandName: string;
  provider: "gemini" | "gpt4o";
  depth: "quick" | "detailed";
  thumbnailUrl?: string | null;
}): Promise<VideoAnalysisResult> {
  const { videoUrl, brandName, provider, depth, thumbnailUrl } = params;

  if (provider === "gpt4o") {
    return analyzeVideoWithGPT4o({ videoUrl, brandName, thumbnailUrl });
  }

  return analyzeVideoWithGemini({ videoUrl, brandName, analysisDepth: depth });
}
