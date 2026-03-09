/**
 * Sanitizes user-supplied strings before they are embedded into AI prompts.
 *
 * Prevents prompt injection attacks where user-controlled text (asset names,
 * brand guideline fields, competitor ad copy) could override system instructions
 * or alter AI behaviour.
 *
 * What it does:
 * - Collapses newlines → single space  (removes multi-line injection attempts)
 * - Replaces "---" → "—"              (prevents section-delimiter injection)
 * - Escapes triple-backticks           (prevents code-block injection)
 * - Trims whitespace
 * - Truncates to maxLen characters     (default 500, use 200 for short fields)
 *
 * What it does NOT do:
 * - HTML-encode (not needed for AI prompt context)
 * - Alter enum values or system-generated strings (only call on user input)
 */
export function sanitizeForPrompt(
  input: string | null | undefined,
  maxLen = 500
): string {
  if (!input) return "";
  return input
    .replace(/[\r\n]+/g, " ")
    .replace(/---+/g, "—")
    .replace(/```/g, "` ` `")
    .trim()
    .slice(0, maxLen);
}
