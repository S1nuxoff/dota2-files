import { useEffect, useState } from "react";

// The page lives in the hash: #/<dataset>/<folder>?file=<path>&q=<query>&kind=<kind>
function parse() {
  const raw = decodeURIComponent(location.hash.slice(1)).replace(/^\/+/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const [ds = "", ...rest] = pathPart.split("/").filter(Boolean);
  const params = new URLSearchParams(queryPart);
  return { ds, dir: rest.join("/"), file: params.get("file") || "", q: params.get("q") || "", kind: params.get("kind") || "" };
}

export function href({ ds = "", dir = "", file = "", q = "", kind = "" }) {
  const params = new URLSearchParams();
  if (file) params.set("file", file);
  if (q) params.set("q", q);
  if (kind) params.set("kind", kind);
  const query = params.toString();
  return `#/${[ds, dir].filter(Boolean).join("/")}${query ? `?${query}` : ""}`;
}

export function navigate(route, replace = false) {
  const next = href(route);
  if (replace) history.replaceState(null, "", next);
  else history.pushState(null, "", next);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const update = () => setRoute(parse());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return route;
}
