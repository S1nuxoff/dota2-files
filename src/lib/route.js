import { useEffect, useState } from "react";

// The page lives in the path: <base>/<dataset or page>/<folder>?file=<path>&q=<query>&kind=<kind>,
// <base> being where the site is served from (vite's base: /dota2-files/ on GitHub Pages)
const BASE = import.meta.env.BASE_URL;

// A page's address ends with "/" (GitHub Pages serves <page>/index.html there and redirects the
// address without it), the query after it
export function link(path) {
  const [page, query] = path.replace(/^\/+/, "").split("?");
  const slashed = page && !page.endsWith("/") ? `${page}/` : page;
  return `${BASE}${slashed}${query ? `?${query}` : ""}`;
}

function parseUrl(pathname, search) {
  const rel = decodeURIComponent(pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, ""));
  const [ds = "", ...rest] = rel.split("/").filter(Boolean);
  const params = new URLSearchParams(search);
  return { ds, dir: rest.join("/"), file: params.get("file") || "", q: params.get("q") || "", kind: params.get("kind") || "" };
}

// An item opened over a page keeps that page in the history entry (state.over): the route is the
// page's, with the item on top (route.item); opened by its address alone, it is a page of its own
function parse() {
  const over = history.state?.over;
  if (over) {
    const under = new URL(over, location.origin);
    const item = /\/item\/([^/]+)/.exec(location.pathname)?.[1] || "";
    return { ...parseUrl(under.pathname, under.search), item };
  }
  return { ...parseUrl(location.pathname, location.search), item: "" };
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

function go(url, replace, state = null) {
  if (replace) history.replaceState(state, "", url);
  else history.pushState(state, "", url);
  changed();
  if (!replace && !state) window.scrollTo(0, 0);
}

export function navigate(route, replace = false) {
  go(href(route), replace);
}

// The items the open one can step to (the list it was opened from), kept for the window's arrows
let itemList = [];
export const openItems = () => itemList;

// An item over the page: a new history entry, so Back closes it; moving to another item from the
// window replaces that entry
export function openItem(id, list) {
  if (list) itemList = list;
  const over = history.state?.over;
  go(link(`/item/${id}`), Boolean(over), { over: over || location.pathname + location.search });
}

export function closeItem() {
  if (history.state?.over) history.back();
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
