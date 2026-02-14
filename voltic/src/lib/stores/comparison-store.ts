import { create } from "zustand";
import type { DiscoverAd } from "@/types/discover";

const MAX_COMPARE_ADS = 4;

interface ComparisonStore {
  selectedAds: DiscoverAd[];
  addAd: (ad: DiscoverAd) => void;
  removeAd: (adId: string) => void;
  clearAll: () => void;
  isSelected: (adId: string) => boolean;
  canAdd: () => boolean;
}

export const useComparisonStore = create<ComparisonStore>((set, get) => ({
  selectedAds: [],

  addAd: (ad) => {
    const { selectedAds } = get();
    if (selectedAds.length >= MAX_COMPARE_ADS) return;
    if (selectedAds.some((a) => a.id === ad.id)) return;
    set({ selectedAds: [...selectedAds, ad] });
  },

  removeAd: (adId) => {
    set((state) => ({
      selectedAds: state.selectedAds.filter((a) => a.id !== adId),
    }));
  },

  clearAll: () => set({ selectedAds: [] }),

  isSelected: (adId) => get().selectedAds.some((a) => a.id === adId),

  canAdd: () => get().selectedAds.length < MAX_COMPARE_ADS,
}));
