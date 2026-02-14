import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
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
    marginBottom: 8,
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
  dosItem: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 4,
    color: colors.muted,
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
    gap: 8,
    marginTop: 8,
  },
  imageThumb: {
    width: 120,
    height: 90,
    objectFit: "cover",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

// ─── Components ─────────────────────────────────────────────────────────────

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Brand Guidelines</Text>
      <Text>{pageNum}</Text>
    </View>
  );
}

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
        Generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </Text>
    </Page>
  );
}

function BrandVoicePage({ guideline }: { guideline: BrandGuidelineEntity }) {
  if (!guideline.brandVoice && !guideline.targetAudience) return null;

  return (
    <Page size="A4" style={styles.page}>
      {guideline.brandVoice && (
        <View style={{ marginBottom: 32 }}>
          <Text style={styles.sectionTitle}>Brand Voice</Text>
          <Text style={styles.paragraph}>{guideline.brandVoice}</Text>
        </View>
      )}
      {guideline.targetAudience && (
        <View style={{ marginBottom: 32 }}>
          <Text style={styles.sectionTitle}>Target Audience</Text>
          <Text style={styles.paragraph}>{guideline.targetAudience}</Text>
        </View>
      )}
      <PageFooter pageNum={2} />
    </Page>
  );
}

function ColorPalettePage({ guideline }: { guideline: BrandGuidelineEntity }) {
  if (guideline.colorPalette.length === 0) return null;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Color Palette</Text>
      <View style={styles.colorGrid}>
        {guideline.colorPalette.map((color, i) => (
          <View key={i} style={styles.colorCard}>
            <View style={[styles.colorSquare, { backgroundColor: color.hex }]} />
            <View style={styles.colorLabel}>
              <Text style={styles.colorName}>{color.name}</Text>
              <Text style={styles.colorHex}>{color.hex.toUpperCase()}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Typography section on same page if it fits */}
      {(guideline.typography.headingFont || guideline.typography.bodyFont) && (
        <View style={{ marginTop: 24 }}>
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
                <Text style={styles.typographyLabel}>{key.toUpperCase()}</Text>
                <Text style={styles.typographyValue}>{value}</Text>
              </View>
            ))}
        </View>
      )}
      <PageFooter pageNum={3} />
    </Page>
  );
}

function DosAndDontsPage({ guideline }: { guideline: BrandGuidelineEntity }) {
  if (!guideline.dosAndDonts) return null;

  const lines = guideline.dosAndDonts.split("\n").filter((l) => l.trim());
  const dos = lines.filter(
    (l) => l.toLowerCase().startsWith("do:") || l.toLowerCase().startsWith("do ")
  );
  const donts = lines.filter(
    (l) =>
      l.toLowerCase().startsWith("don't:") ||
      l.toLowerCase().startsWith("don't ") ||
      l.toLowerCase().startsWith("dont:")
  );
  const other = lines.filter(
    (l) =>
      !dos.includes(l) && !donts.includes(l)
  );

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>{"Do's & Don'ts"}</Text>
      {dos.length > 0 || donts.length > 0 ? (
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={styles.sectionSubtitle}>{"Do's"}</Text>
            {dos.map((item, i) => (
              <Text key={i} style={styles.dosItem}>
                {item}
              </Text>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.sectionSubtitle}>{"Don'ts"}</Text>
            {donts.map((item, i) => (
              <Text key={i} style={styles.dosItem}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        other.map((item, i) => (
          <Text key={i} style={styles.dosItem}>
            {item}
          </Text>
        ))
      )}
      {guideline.dosAndDonts && dos.length === 0 && donts.length === 0 && other.length === 0 && (
        <Text style={styles.paragraph}>{guideline.dosAndDonts}</Text>
      )}
      <PageFooter pageNum={4} />
    </Page>
  );
}

function BrandAssetsPage({ guideline }: { guideline: BrandGuidelineEntity }) {
  const imageFiles = guideline.files.filter((f) =>
    f.type.startsWith("image/")
  );
  if (imageFiles.length === 0) return null;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Brand Assets</Text>
      <View style={styles.imageGrid}>
        {imageFiles.map((file, i) => (
          <Image key={i} src={file.url} style={styles.imageThumb} />
        ))}
      </View>
      <PageFooter pageNum={5} />
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
      <BrandVoicePage guideline={guideline} />
      <ColorPalettePage guideline={guideline} />
      <DosAndDontsPage guideline={guideline} />
      <BrandAssetsPage guideline={guideline} />
    </Document>
  );
}
