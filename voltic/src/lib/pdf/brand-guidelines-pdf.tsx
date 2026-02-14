import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BrandGuidelineEntity } from "@/types/brand-guidelines";

// ─── Styles ─────────────────────────────────────────────────────────────────

const colors = {
  dark: "#1a1a2e",
  accent: "#6366f1",
  muted: "#64748b",
  light: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 64,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  coverPage: {
    padding: 48,
    fontFamily: "Helvetica",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.dark,
    color: colors.white,
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 40,
  },
  coverColorBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 20,
  },
  coverSwatch: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 16,
    color: colors.dark,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 10,
    color: colors.dark,
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.muted,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  colorCard: {
    width: 100,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorSquare: {
    width: 100,
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colorLabel: {
    padding: 8,
    backgroundColor: colors.white,
  },
  colorName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.dark,
  },
  colorHex: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 24,
  },
  column: {
    flex: 1,
  },
  listItem: {
    fontSize: 10,
    lineHeight: 1.7,
    marginBottom: 6,
    color: colors.muted,
    paddingLeft: 4,
  },
  typographyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typographyLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.dark,
  },
  typographyValue: {
    fontSize: 10,
    color: colors.muted,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
  },
  logoImage: {
    width: 120,
    height: 120,
    objectFit: "contain",
    marginBottom: 24,
    borderRadius: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  imageThumb: {
    width: 155,
    height: 120,
    objectFit: "cover",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

// ─── Do's & Don'ts parser ───────────────────────────────────────────────────

function parseDosAndDonts(text: string): {
  dos: string[];
  donts: string[];
  unstructured: string[];
} {
  // Split on bullet (•), newlines, or numbered prefixes
  const rawItems = text
    .split(/[•\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const dos: string[] = [];
  const donts: string[] = [];
  const unstructured: string[] = [];

  for (const item of rawItems) {
    // Match "Do:" / "Do " prefix
    const doMatch = item.match(
      /^(?:[-*]\s*)?do\s*[:.]?\s+(.+)/i
    );
    // Match "Don't:" / "Don't " / "Dont:" prefix
    const dontMatch = item.match(
      /^(?:[-*]\s*)?don[''\u2019]?t\s*[:.]?\s+(.+)/i
    );

    if (dontMatch) {
      donts.push(dontMatch[1]);
    } else if (doMatch) {
      dos.push(doMatch[1]);
    } else {
      unstructured.push(item);
    }
  }

  return { dos, donts, unstructured };
}

// ─── Cover Page ─────────────────────────────────────────────────────────────

function CoverPage({ guideline }: { guideline: BrandGuidelineEntity }) {
  return (
    <Page size="A4" style={styles.coverPage}>
      {guideline.logoUrl && (
        <Image src={guideline.logoUrl} style={styles.logoImage} />
      )}
      <Text style={styles.coverTitle}>
        {guideline.brandName ?? guideline.name}
      </Text>
      <Text style={styles.coverSubtitle}>Brand Guidelines</Text>
      {guideline.colorPalette.length > 0 && (
        <View style={styles.coverColorBar}>
          {guideline.colorPalette.slice(0, 6).map((color, i) => (
            <View
              key={i}
              style={[styles.coverSwatch, { backgroundColor: color.hex }]}
            />
          ))}
        </View>
      )}
      <Text style={[styles.coverSubtitle, { marginTop: 40, fontSize: 10 }]}>
        Generated on{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </Text>
    </Page>
  );
}

// ─── Content Pages (single wrapping page) ───────────────────────────────────

function ContentPages({ guideline }: { guideline: BrandGuidelineEntity }) {
  const hasVoice = !!guideline.brandVoice;
  const hasAudience = !!guideline.targetAudience;
  const hasColors = guideline.colorPalette.length > 0;
  const hasTypography =
    !!guideline.typography.headingFont || !!guideline.typography.bodyFont;
  const hasDosAndDonts = !!guideline.dosAndDonts;
  const imageFiles = guideline.files.filter((f) => f.type.startsWith("image/"));
  const hasImages = imageFiles.length > 0;

  const hasAnyContent =
    hasVoice ||
    hasAudience ||
    hasColors ||
    hasTypography ||
    hasDosAndDonts ||
    hasImages;

  if (!hasAnyContent) return null;

  const parsed = hasDosAndDonts
    ? parseDosAndDonts(guideline.dosAndDonts!)
    : null;

  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Dynamic footer on every content page */}
      <View style={styles.footer} fixed>
        <Text>{guideline.brandName ?? guideline.name}</Text>
        <Text
          render={({ pageNumber }) => `${pageNumber}`}
        />
      </View>

      {/* ── Brand Voice ─────────────────────────────────────── */}
      {hasVoice && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Voice</Text>
          <Text style={styles.paragraph}>{guideline.brandVoice}</Text>
        </View>
      )}

      {/* ── Target Audience ─────────────────────────────────── */}
      {hasAudience && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Audience</Text>
          <Text style={styles.paragraph}>{guideline.targetAudience}</Text>
        </View>
      )}

      {/* ── Color Palette ───────────────────────────────────── */}
      {hasColors && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorGrid}>
            {guideline.colorPalette.map((color, i) => (
              <View key={i} style={styles.colorCard}>
                <View
                  style={[
                    styles.colorSquare,
                    { backgroundColor: color.hex },
                  ]}
                />
                <View style={styles.colorLabel}>
                  <Text style={styles.colorName}>{color.name}</Text>
                  <Text style={styles.colorHex}>
                    {color.hex.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Typography ──────────────────────────────────────── */}
      {hasTypography && (
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Typography</Text>
          {guideline.typography.headingFont && (
            <View style={styles.typographyRow}>
              <Text style={styles.typographyLabel}>Heading Font</Text>
              <Text style={styles.typographyValue}>
                {guideline.typography.headingFont}
              </Text>
            </View>
          )}
          {guideline.typography.bodyFont && (
            <View style={styles.typographyRow}>
              <Text style={styles.typographyLabel}>Body Font</Text>
              <Text style={styles.typographyValue}>
                {guideline.typography.bodyFont}
              </Text>
            </View>
          )}
          {guideline.typography.sizes &&
            Object.entries(guideline.typography.sizes).map(([key, value]) => (
              <View key={key} style={styles.typographyRow}>
                <Text style={styles.typographyLabel}>
                  {key.toUpperCase()}
                </Text>
                <Text style={styles.typographyValue}>{value}</Text>
              </View>
            ))}
        </View>
      )}

      {/* ── Do's & Don'ts ───────────────────────────────────── */}
      {hasDosAndDonts && parsed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"Do's & Don'ts"}</Text>
          {parsed.dos.length > 0 || parsed.donts.length > 0 ? (
            <View style={styles.twoColumn}>
              {parsed.dos.length > 0 && (
                <View style={styles.column}>
                  <Text style={styles.sectionSubtitle}>{"Do's"}</Text>
                  {parsed.dos.map((item, i) => (
                    <Text key={i} style={styles.listItem}>
                      {"  +  "}
                      {item}
                    </Text>
                  ))}
                </View>
              )}
              {parsed.donts.length > 0 && (
                <View style={styles.column}>
                  <Text style={styles.sectionSubtitle}>{"Don'ts"}</Text>
                  {parsed.donts.map((item, i) => (
                    <Text key={i} style={styles.listItem}>
                      {"  -  "}
                      {item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* No clear Do/Don't structure — render as simple list */
            parsed.unstructured.map((item, i) => (
              <Text key={i} style={styles.listItem}>
                {"  \u2022  "}
                {item}
              </Text>
            ))
          )}
          {/* Fallback: raw text if parser produced nothing */}
          {parsed.dos.length === 0 &&
            parsed.donts.length === 0 &&
            parsed.unstructured.length === 0 && (
              <Text style={styles.paragraph}>{guideline.dosAndDonts}</Text>
            )}
        </View>
      )}

      {/* ── Brand Assets ────────────────────────────────────── */}
      {hasImages && (
        <View style={styles.section} break>
          <Text style={styles.sectionTitle}>Brand Assets</Text>
          <View style={styles.imageGrid}>
            {imageFiles.map((file, i) => (
              <Image key={i} src={file.url} style={styles.imageThumb} />
            ))}
          </View>
        </View>
      )}
    </Page>
  );
}

// ─── Main Document ──────────────────────────────────────────────────────────

export function BrandGuidelinesPDF({
  guideline,
}: {
  guideline: BrandGuidelineEntity;
}) {
  return (
    <Document>
      <CoverPage guideline={guideline} />
      <ContentPages guideline={guideline} />
    </Document>
  );
}
