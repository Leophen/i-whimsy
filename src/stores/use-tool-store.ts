'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ToolStore {
  favorites: string[];
  recent: string[];
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  pushRecent: (slug: string) => void;
  clearRecent: () => void;
}

const MAX_RECENT = 12;

export const useToolStore = create<ToolStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      recent: [],
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      toggleFavorite: (slug) => {
        const list = get().favorites;
        set({
          favorites: list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list],
        });
      },
      isFavorite: (slug) => get().favorites.includes(slug),
      pushRecent: (slug) => {
        const list = [slug, ...get().recent.filter((s) => s !== slug)];
        set({ recent: list.slice(0, MAX_RECENT) });
      },
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'iwhimsy-tool-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ favorites: state.favorites, recent: state.recent }),
      skipHydration: true,
    },
  ),
);
