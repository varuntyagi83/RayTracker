"use client";
import { useEffect } from "react";

export function SubscriptionStatusRefresh() {
  useEffect(() => {
    fetch("/api/subscription/status").catch(() => {});
  }, []);
  return null;
}
