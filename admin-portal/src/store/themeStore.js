import { create } from 'zustand';

/** 'light' | 'dark' | 'system' (follows the device setting). */
const read = () => {
  try { return localStorage.getItem('theme') || 'light'; } catch { return 'light'; }
};
const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

/** The theme actually shown ("system" resolved to light or dark). */
export const resolveTheme = (theme) => (theme === 'system' ? (darkQuery()?.matches ? 'dark' : 'light') : theme);

const apply = (theme) => {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
};

const useThemeStore = create((set, get) => ({
  theme: read(),
  sidebarOpen: typeof window === 'undefined' || window.innerWidth >= 1024,
  sidebarCompact: false,

  setTheme: (theme) => {
    try { localStorage.setItem('theme', theme); } catch { /* private mode: keep for this visit */ }
    apply(theme);
    set({ theme });
  },

  toggleTheme: () => get().setTheme(resolveTheme(get().theme) === 'dark' ? 'light' : 'dark'),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarCompact: (v) => set({ sidebarCompact: v }),
}));

// Follow the device setting live while "system" is chosen.
darkQuery()?.addEventListener?.('change', () => {
  if (useThemeStore.getState().theme === 'system') apply('system');
});

export default useThemeStore;
