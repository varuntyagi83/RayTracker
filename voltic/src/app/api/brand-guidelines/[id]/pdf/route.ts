import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getWorkspace } from "@/lib/supabase/queries";
import { getBrandGuidelineById } from "@/lib/data/brand-guidelines-entities";
import { BrandGuidelinesPDF } from "@/lib/pdf/brand-guidelines-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const workspace = await getWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const guideline = await getBrandGuidelineById(workspace.id, id);
  if (!guideline) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(BrandGuidelinesPDF, { guideline }) as any;
  const pdfBuffer = await renderToBuffer(element);

  return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="brand-guidelines-${guideline.slug}.pdf"`,
    },
  });
}
