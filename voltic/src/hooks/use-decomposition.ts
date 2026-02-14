"use client";

import { useState, useCallback } from "react";
import type {
  AdDecomposition,
  SourceType,
  SaveAsAssetResult,
  SavedTextElement,
} from "@/types/decomposition";

export type DecompositionStatus =
  | "idle"
  | "analyzing"
  | "generating"
  | "completed"
  | "error";

export interface UseDecompositionReturn {
  status: DecompositionStatus;
  result: AdDecomposition | null;
  error: string | null;

  decompose: (
    imageUrl: string,
    sourceType: SourceType,
    sourceId?: string
  ) => Promise<void>;
  saveAsAsset: () => Promise<SaveAsAssetResult>;
  getTextsForBuilder: () => Promise<SavedTextElement[]>;
  reset: () => void;
}

export function useDecomposition(): UseDecompositionReturn {
  const [status, setStatus] = useState<DecompositionStatus>("idle");
  const [result, setResult] = useState<AdDecomposition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decompose = useCallback(
    async (imageUrl: string, sourceType: SourceType, sourceId?: string) => {
      setStatus("analyzing");
      setError(null);
      setResult(null);

      try {
        const res = await fetch("/api/decompose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            source_type: sourceType,
            source_id: sourceId,
            generate_clean_image: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Decomposition failed");
        }

        // Cached results now include full data from the API, same as non-cached
        if (data.cached && data.result) {
          setResult({
            id: data.decomposition_id,
            workspaceId: "",
            sourceImageUrl: imageUrl,
            sourceType,
            sourceId: sourceId ?? null,
            extractedTexts: data.result.texts,
            productAnalysis: data.result.product,
            backgroundAnalysis: data.result.background,
            layoutAnalysis: data.result.layout,
            cleanImageUrl: data.result.clean_image_url,
            processingStatus: "completed",
            creditsUsed: 0,
            errorMessage: null,
            createdAt: "",
            updatedAt: "",
          });
          setStatus("completed");
          return;
        }

        // Non-cached: build result from the inline response
        setResult({
          id: data.decomposition_id,
          workspaceId: "",
          sourceImageUrl: imageUrl,
          sourceType,
          sourceId: sourceId ?? null,
          extractedTexts: data.result.texts,
          productAnalysis: data.result.product,
          backgroundAnalysis: data.result.background,
          layoutAnalysis: data.result.layout,
          cleanImageUrl: data.result.clean_image_url,
          processingStatus: "completed",
          creditsUsed: 0,
          errorMessage: null,
          createdAt: "",
          updatedAt: "",
        });
        setStatus("completed");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
      }
    },
    []
  );

  const saveAsAsset = useCallback(async (): Promise<SaveAsAssetResult> => {
    if (!result?.id) {
      throw new Error("No decomposition result to save");
    }

    const res = await fetch(`/api/decompose/${result.id}/save-asset`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to save as asset");
    }

    return data as SaveAsAssetResult;
  }, [result]);

  const getTextsForBuilder = useCallback(async (): Promise<
    SavedTextElement[]
  > => {
    if (!result?.id) {
      throw new Error("No decomposition result");
    }

    const res = await fetch(`/api/decompose/${result.id}/save-texts`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to get texts");
    }

    return data.texts as SavedTextElement[];
  }, [result]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    decompose,
    saveAsAsset,
    getTextsForBuilder,
    reset,
  };
}
