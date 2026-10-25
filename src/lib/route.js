import { useEffect, useState } from "react";

// The page lives in the path: <base>/<dataset or page>/<folder>?file=<path>&q=<query>&kind=<kind>,
// <base> being where the site is served from (vite's base: /dota2-files/ on GitHub Pages)
const BASE = import.meta.env.BASE_URL;

export const link = (path) => `${BASE}${path.replace(/^\/+/, "")}`;

function parse() {
  const rel = decodeURIComponent(location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\/+/, ""));
  const [ds = "", ...rest] = rel.split("/").filter(Boolean);
  const params = new URLSearchParams(location.search);
  return { ds, dir: rest.join("/"), file: params.get("file") || "", q: params.get("q") || "", kind: params.get("kind") || "" };
}

export function href({ ds = "", dir = "", file = "", q = "", kind = "" }) {
  const params = new URLSearchParams();
  if (file) params.set("file", file);
  if (q) params.set("q", q);
  if (kind) params.set("kind", kind);
  const query = params.toString();
  const path = [ds, ...dir.split("/")].filter(Boolean).map(encodeURIComponent).join("/");
  return `${link(path)}${query ? `?${query}` : ""}`;
}

const changed = () => window.dispatchEvent(new Event("locationchange"));

function go(url, replace) {
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  changed();
  if (!replace) window.scrollTo(0, 0);
}

export function navigate(route, replace = false) {
  go(href(route), replace);
}

// Links of the site open in place: a click on <a href="<base>..."> moves the page without loading it
// again (not with a modifier key, a target, a download, or a link to a file of the datasets)
export function followLinks() {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
    e.preventDefault();
    go(url.pathname + url.search, false);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

// Old addresses (#/hero/invoker) go to their path
export function fromHash() {
  if (location.hash.startsWith("#/")) history.replaceState(null, "", link(location.hash.slice(2)));
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const update = () => setRoute(parse());
    window.addEventListener("locationchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("locationchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return route;
}
