import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

export interface AppState {
  theme: Theme;
  navigationOpen: boolean;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  setNavigationOpen(open: boolean): void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      navigationOpen: false,

      setTheme(theme) {
        set({ theme });
      },

      toggleTheme() {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },

      setNavigationOpen(open) {
        set({ navigationOpen: open });
      },
    }),
    {
      name: 'openrotor-lab/app/v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
