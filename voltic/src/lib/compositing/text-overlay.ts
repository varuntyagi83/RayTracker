import sharp from "sharp";
import type { TextPosition, TextPositionType } from "@/types/ads";

interface CompositeOptions {
  backgroundBuffer: Buffer;
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  textPosition: TextPosition;
}

interface CompositeResult {
  buffer: Buffer;
  width: number;
  height: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function calculatePosition(
  posType: TextPositionType,
  imgWidth: number,
  imgHeight: number,
  customX?: number,
  customY?: number
): { x: number; y: number; anchor: string } {
  const padding = Math.round(imgWidth * 0.05);

  switch (posType) {
    case "top":
      return { x: imgWidth / 2, y: padding + 40, anchor: "middle" };
    case "bottom":
      return { x: imgWidth / 2, y: imgHeight - padding, anchor: "middle" };
    case "top-left":
      return { x: padding, y: padding + 40, anchor: "start" };
    case "top-right":
      return { x: imgWidth - padding, y: padding + 40, anchor: "end" };
    case "bottom-left":
      return { x: padding, y: imgHeight - padding, anchor: "start" };
    case "bottom-right":
      return { x: imgWidth - padding, y: imgHeight - padding, anchor: "end" };
    case "custom":
      return {
        x: customX ?? imgWidth / 2,
        y: customY ?? imgHeight / 2,
        anchor: "middle",
      };
    case "center":
    default:
      return { x: imgWidth / 2, y: imgHeight / 2, anchor: "middle" };
  }
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxCharsPerLine && current.length > 0) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? " " : "") + word;
    }
  }
  if (current) lines.push(current.trim());

  return lines;
}

function buildSvgOverlay(
  width: number,
  height: number,
  text: string,
  fontFamily: string,
  fontSize: number,
  textColor: string,
  textPosition: TextPosition
): string {
  const { x, y, anchor } = calculatePosition(
    textPosition.type,
    width,
    height,
    textPosition.x,
    textPosition.y
  );

  // Estimate characters per line based on font size and image width
  const avgCharWidth = fontSize * 0.55;
  const maxWidth = width * 0.85;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

  const lines = wrapText(text, maxCharsPerLine);
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;

  // Adjust starting Y to vertically center the text block
  let startY = y;
  if (textPosition.type === "center" || textPosition.type === "custom") {
    startY = y - totalHeight / 2 + fontSize;
  }

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join("");

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.7)" />
    </filter>
  </defs>
  <text
    x="${x}"
    y="${startY}"
    font-family="${escapeXml(fontFamily)}, sans-serif"
    font-size="${fontSize}"
    fill="${escapeXml(textColor)}"
    text-anchor="${anchor}"
    filter="url(#shadow)"
    dominant-baseline="auto"
  >${tspans}</text>
</svg>`;
}

export async function compositeTextOnImage(
  options: CompositeOptions
): Promise<CompositeResult> {
  const { backgroundBuffer, text, fontFamily, fontSize, textColor, textPosition } =
    options;

  // Get image metadata
  const metadata = await sharp(backgroundBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  // Build SVG overlay
  const svgString = buildSvgOverlay(
    width,
    height,
    text,
    fontFamily,
    fontSize,
    textColor,
    textPosition
  );
  const svgBuffer = Buffer.from(svgString);

  // Composite
  const result = await sharp(backgroundBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png({ quality: 95 })
    .toBuffer();

  return { buffer: result, width, height };
}
