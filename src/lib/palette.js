import { useEffect, useState } from "react";

// The search window over every page (components/CommandPalette.jsx): opened by the bar's search, the
// phone's Search tab, a page's own search field, Ctrl+K or "/", optionally with words already typed
let state = { open: false, query: "" };
const listeners = new Set();
const set = (next) => {
  state = next;
  listeners.forEach((l) => l(state));
};

export const openPalette = (query = "") => set({ open: true, query });
export const closePalette = () => set({ ...state, open: false });

export function usePalette() {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    listeners.add(setCurrent);
    return () => listeners.delete(setCurrent);
  }, []);
  return current;
}

// The searches made lately, newest first, remembered per browser
const KEY = "recent-searches";
export function recentSearches() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]").slice(0, 6);
  } catch {
    return [];
  }
}
export function rememberSearch(query) {
  const q = query.trim();
  if (!q) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([q, ...recentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6)));
  } catch {}
}
