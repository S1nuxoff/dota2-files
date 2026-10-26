import { useCallback, useEffect, useMemo, useState } from "react";
import { DATASETS, datasetById } from "./datasets.js";
import { loadIndex, findDir, filesUnder } from "./lib/lists.js";
import { useCatalog, prefabTitle } from "./lib/catalog.js";
import { navigate, useRoute } from "./lib/route.js";
import TopBar, { MobileNav } from "./components/TopBar.jsx";
import Footer from "./components/Footer.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import { useReveal } from "./components/ui.jsx";
import Home from "./components/Home.jsx";
import Browser from "./components/Browser.jsx";
import HeroesPage from "./components/HeroesPage.jsx";
import HeroPage from "./components/HeroPage.jsx";
import ItemPage from "./components/ItemPage.jsx";
import CosmeticsPage from "./components/CosmeticsPage.jsx";
import ModelsPage from "./components/ModelsPage.jsx";
import MapPage from "./components/MapPage.jsx";
import ItemModal from "./components/ItemModal.jsx";
import SetPage from "./components/SetPage.jsx";
import BundlesPage from "./components/BundlesPage.jsx";
import HomePage from "./components/HomePage.jsx";
import SearchPage from "./components/SearchPage.jsx";
import MusicPage from "./components/MusicPage.jsx";
import SetsPage from "./components/SetsPage.jsx";
import Preview from "./components/Preview.jsx";
import SelectionBar from "./components/SelectionBar.jsx";
import Tray from "./components/Tray.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Pages by the route's first part: the catalog's (heroes, items, kinds of items), the folders of a
// dataset, search across every dataset
export default function App() {
  const route = useRoute();
  const ds = datasetById(route.ds);
  const { catalog, error: catalogError } = useCatalog();
  const [indexes, setIndexes] = useState({});
  const [errors, setErrors] = useState({});
  const [withCopies, setWithCopies] = useState(false);
  // Picked files and folders: key -> { ds, path, dir }
  const [selection, setSelection] = useState(new Map());
  useReveal();

  // Every list loads at the start (about 4 MB): a hero's page and search need them all
  useEffect(() => {
    for (const d of DATASETS) {
      loadIndex(d).then(
        (index) => setIndexes((all) => (all[d.id] ? all : { ...all, [d.id]: index })),
        (error) => setErrors((all) => ({ ...all, [d.id]: String(error.message || error) }))
      );
    }
  }, []);

  const hero = route.ds === "hero" && catalog?.heroByKey.get(route.dir);
  const item = route.ds === "item" && catalog?.items[route.dir];
  useEffect(() => {
    const page = ds
      ? `${ds.title}${route.dir ? ` / ${route.dir.split("/").pop()}` : ""}`
      : hero
        ? hero.name
        : item
          ? item.name
          : route.ds === "3d"
            ? "3D models"
            : route.ds === "map"
            ? "The map"
            : route.ds === "music"
            ? "Music"
            : route.ds === "heroes"
            ? "Heroes"
            : route.ds === "sets"
            ? "Sets"
            : route.ds === "set"
            ? catalog?.setByKey.get(route.dir)?.name || ""
            : route.ds === "bundles"
            ? "Bundles"
            : route.ds === "files"
            ? "Files"
            : route.ds === "all" && route.q
            ? `Search: ${route.q}`
            : route.ds === "cosmetics"
            ? route.dir ? (route.dir === "treasures" ? "Treasures" : prefabTitle(route.dir)) : "Cosmetics"
            : "";
    document.title = page ? `${page} - Dotadex Files` : "Dotadex Files";
  }, [ds, route.ds, route.dir, route.q, hero, item, catalog]);

  const toggle = useCallback((picked) => {
    setSelection((current) => {
      const next = new Map(current);
      const key = `${picked.ds}:${picked.path}${picked.dir ? "/" : ""}`;
      if (next.has(key)) next.delete(key);
      else next.set(key, picked);
      return next;
    });
  }, []);

  // The picked items as files to download, named by their path under base (the folder they were picked in)
  const resolve = useCallback(
    (items, base = "") => {
      const datasets = new Set(items.map((i) => i.ds));
      const out = new Map();
      for (const picked of items) {
        const index = indexes[picked.ds];
        if (!index) continue;
        const files = picked.dir ? filesUnder(findDir(index.tree(withCopies), picked.path) || { files: [], dirs: new Map() }) : [picked.entry];
        for (const f of files) {
          let name = base && f.path.startsWith(`${base}/`) ? f.path.slice(base.length + 1) : f.path;
          if (datasets.size > 1) name = `${datasetById(f.ds).repo}/${name}`;
          out.set(`${f.ds}:${f.path}`, { ds: f.ds, path: f.path, size: f.size, name });
        }
      }
      return [...out.values()];
    },
    [indexes, withCopies]
  );

  // In a dataset the file is its path; anywhere else <dataset>:<path>
  const previewEntry = useMemo(() => {
    if (!route.file) return null;
    if (ds) return indexes[ds.id]?.entries.find((e) => e.path === route.file) || null;
    const cut = route.file.indexOf(":");
    const path = route.file.slice(cut + 1);
    return indexes[route.file.slice(0, cut)]?.entries.find((e) => e.path === path) || null;
  }, [ds, indexes, route.file]);

  const common = { route, catalog, indexes, withCopies };
  let page;
  if (route.ds === "all" && route.q) page = <SearchPage {...common} />;
  else if (ds || route.ds === "all") {
    page = (
      <Browser
        key={ds?.id || "all"}
        ds={ds}
        index={ds && indexes[ds.id]}
        error={ds && errors[ds.id]}
        setWithCopies={setWithCopies}
        selection={selection}
        toggle={toggle}
        resolve={resolve}
        {...common}
      />
    );
  } else if (route.ds === "hero") page = <HeroPage key={route.dir} heroKey={route.dir} {...common} />;
  else if (route.ds === "sets") page = <SetsPage catalog={catalog} />;
  else if (route.ds === "music") page = <MusicPage {...common} />;
  else if (route.ds === "bundles") page = <BundlesPage catalog={catalog} />;
  else if (route.ds === "set") page = <SetPage key={route.dir} setKey={route.dir} {...common} />;
  else if (route.ds === "item") page = <ItemPage key={route.dir} itemId={route.dir} {...common} />;
  else if (route.ds === "cosmetics") page = <CosmeticsPage key={route.dir} prefab={route.dir} catalog={catalog} />;
  else if (route.ds === "3d") page = <ModelsPage catalog={catalog} indexes={indexes} />;
  else if (route.ds === "map") page = <MapPage catalog={catalog} indexes={indexes} />;
  else if (route.ds === "files") page = <Home indexes={indexes} errors={errors} />;
  else if (route.ds === "heroes") page = <HeroesPage catalog={catalog} error={catalogError} />;
  else page = <HomePage catalog={catalog} indexes={indexes} />;

  // The files browser runs to the foot of the window: no footer under it
  const bare = !!ds || (route.ds === "all" && !route.q);
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-ink-100 focus:px-3 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>
      <TopBar route={route} />
      <main id="main" className="flex min-w-0 flex-1 flex-col pb-nav">
        <ErrorBoundary page={`${route.ds}/${route.dir}`}>{page}</ErrorBoundary>
        {!bare && <Footer />}
      </main>
      <MobileNav route={route} />
      {previewEntry && <Preview entry={previewEntry} ds={datasetById(previewEntry.ds)} onClose={() => navigate({ ...route, file: "" })} />}
      {route.item && <ItemModal itemId={route.item} catalog={catalog} indexes={indexes} withCopies={withCopies} />}
      <SelectionBar selection={selection} clear={() => setSelection(new Map())} resolve={resolve} route={route} />
      <Tray />
      <CommandPalette catalog={catalog} />
    </div>
  );
}
