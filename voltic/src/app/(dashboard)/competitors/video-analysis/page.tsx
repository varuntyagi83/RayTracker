import type { Metadata } from "next";
import VideoAnalysisClient from "./components/video-analysis-client";

export const metadata: Metadata = {
  title: "Video Ad Analysis — Voltic",
};

export default function VideoAnalysisPage() {
  return <VideoAnalysisClient />;
}
