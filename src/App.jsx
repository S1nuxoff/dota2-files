import { useCallback, useEffect, useMemo, useState } from "react";
import { DATASETS, datasetById } from "./datasets.js";
import { loadIndex, findDir, filesUnder } from "./lib/lists.js";
import { navigate, useRoute } from "./lib/route.js";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Home from "./components/Home.jsx";
import Browser from "./components/Browser.jsx";
import Preview from "./components/Preview.jsx";
import SelectionBar from "./components/SelectionBar.jsx";
import Tray from "./components/Tray.jsx";

export default function App() {
  const route = useRoute();
  const ds = datasetById(route.ds);
  const [indexes, setIndexes] = useState({});
  const [errors, setErrors] = useState({});
  const [withCopies, setWithCopies] = useState(false);
  // Picked files and folders: key -> { ds, path, dir }
  const [selection, setSelection] = useState(new Map());

  const load = useCallback((d) => {
    loadIndex(d).then(
      (index) => setIndexes((all) => (all[d.id] ? all : { ...all, [d.id]: index })),
      (error) => setErrors((all) => ({ ...all, [d.id]: String(error.message || error) }))
    );
  }, []);

  // Every list loads in the background: the home page counts them, search reaches them all
  useEffect(() => {
    if (ds) load(ds);
    const others = setTimeout(() => DATASETS.forEach(load), ds ? 1500 : 0);
    return () => clearTimeout(others);
  }, [ds, load]);

  useEffect(() => {
    document.title = ds ? `${ds.title}${route.dir ? ` / ${route.dir.split("/").pop()}` : ""} - Dotadex Files` : "Dotadex Files";
  }, [ds, route.dir]);

  const toggle = useCallback((item) => {
    setSelection((current) => {
      const next = new Map(current);
      const key = `${item.ds}:${item.path}${item.dir ? "/" : ""}`;
      if (next.has(key)) next.delete(key);
      else next.set(key, item);
      return next;
    });
  }, []);

  // The picked items as files to download, named by their path under base (the folder they were picked in)
  const resolve = useCallback(
    (items, base = "") => {
      const datasets = new Set(items.map((i) => i.ds));
      const out = new Map();
      for (const item of items) {
        const index = indexes[item.ds];
        if (!index) continue;
        const files = item.dir ? filesUnder(findDir(index.tree(withCopies), item.path) || { files: [], dirs: new Map() }) : [item.entry];
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

  const index = ds && indexes[ds.id];
  const allMode = route.ds === "all";
  // Across every dataset the file is <dataset>:<path>
  const previewEntry = useMemo(() => {
    if (!route.file) return null;
    const cut = allMode ? route.file.indexOf(":") : -1;
    const from = allMode ? indexes[route.file.slice(0, cut)] : index;
    const path = allMode ? route.file.slice(cut + 1) : route.file;
    return from?.entries.find((e) => e.path === path) || null;
  }, [allMode, indexes, index, route.file]);

  return (
    <div className="flex h-full flex-col">
      <Header route={route} ds={ds} />
      <div className="flex min-h-0 flex-1">
        <Sidebar route={route} indexes={indexes} />
        <main className="flex min-w-0 flex-1 flex-col">
          {ds || allMode ? (
            <Browser
              key={ds?.id || "all"}
              ds={ds}
              route={route}
              index={index}
              error={errors[ds.id]}
              indexes={indexes}
              withCopies={withCopies}
              setWithCopies={setWithCopies}
              selection={selection}
              toggle={toggle}
              resolve={resolve}
            />
          ) : (
            <Home indexes={indexes} errors={errors} />
          )}
        </main>
        {previewEntry && <Preview entry={previewEntry} ds={datasetById(previewEntry.ds)} onClose={() => navigate({ ...route, file: "" })} />}
      </div>
      <SelectionBar selection={selection} clear={() => setSelection(new Map())} resolve={resolve} route={route} />
      <Tray />
    </div>
  );
}
