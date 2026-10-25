import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileArchive, Image as ImageIcon, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

const previewUrl = (m) => fileUrl(datasetById("models"), `previews/${m.path.slice(0, -4)}.webp`);

// The colour of a model, from its preview: the mean of its opaque pixels, for the light behind it
function useTint(url) {
  const [tint, setTint] = useState(null);
  useEffect(() => {
    let live = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, 32, 32);
      const d = g.getImageData(0, 0, 32, 32).data;
      let r = 0, gr = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        r += d[i];
        gr += d[i + 1];
        b += d[i + 2];
        n++;
      }
      if (live && n) setTint([r / n, gr / n, b / n].map(Math.round));
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  return tint;
}

// One model card opened in a window over the list, the whole height of the screen: the model large in
// its own light, its variants under it, its measures and textures beside it. Esc or a click outside
// closes it, the arrows go through the list
export default function ModelPanel({ card, entries, onClose, onPrev, onNext }) {
  const [index, setIndex] = useState(0);
  const model = card.models[Math.min(index, card.models.length - 1)];
  const entry = entries.get(`${model.ds}:${model.path}`);
  const textures = model.textures.map((path) => ({ path, entry: entries.get(`textures:${path}`) }));
  const fileName = model.path.split("/").pop();
  const base = fileName.replace(/\.glb$/, "");
  const textureFiles = textures.filter((t) => t.entry).map((t) => ({ ds: "textures", path: t.path, size: t.entry.size, name: `textures/${t.path.split("/").pop()}` }));
  const withTextures = [{ ds: model.ds, path: model.path, size: entry?.size || 0, name: fileName }, ...textureFiles];
  const tint = useTint(previewUrl(model));
  const light = tint ? `rgb(${tint.join(" ")} / 0.28)` : "rgb(255 255 255 / 0.06)";

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, onPrev, onNext]);

  const icon = "flex h-9 w-9 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/8 hover:text-ink-100";

  return (
    <div className="fixed inset-0 z-40 flex bg-black/55 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={card.name} onClick={onClose}>
      <div className="flex min-h-0 w-full overflow-hidden rounded-3xl border border-white/8 bg-ink-900 shadow-2xl shadow-black/60" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2 border-b border-white/6 px-4 py-3">
            <button onClick={onPrev} title="Previous (Left arrow)" aria-label="Previous model" className={icon}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={onNext} title="Next (Right arrow)" aria-label="Next model" className={icon}>
              <ChevronRight size={18} />
            </button>
            <div className="ml-2 min-w-0 flex-1">
              <h2 className="truncate text-[1.15rem] font-semibold tracking-[-0.02em] capitalize">{card.name}</h2>
              <p className="truncate text-[0.82rem] text-ink-400 capitalize">{[card.heroName, model.group, model.theme].filter(Boolean).join(", ") || model.type}</p>
            </div>
            {textureFiles.length > 0 && (
              <button onClick={() => startJob("zip", withTextures, base)} className="flex h-9 items-center gap-2 rounded-full border border-white/10 px-3.5 text-[0.88rem] text-ink-100 hover:bg-white/6">
                <FileArchive size={16} /> With textures
              </button>
            )}
            <a href={fileUrl(datasetById(model.ds), model.path, true)} className="flex h-9 items-center gap-2 rounded-full bg-ink-100 px-3.5 text-[0.88rem] font-medium text-ink-950 hover:bg-white">
              <Download size={16} /> Download glb <span className="font-normal text-ink-950/55">{formatSize(entry?.size)}</span>
            </a>
            <button onClick={onClose} title="Close (Esc)" aria-label="Close" className={`${icon} ml-1`}>
              <X size={18} />
            </button>
          </header>

          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 55% at 50% 52%, ${light}, transparent 72%)` }} />
            {entry && (
              <Suspense fallback={null}>
                <HeroViewer key={model.path} models={[entry]} bare />
              </Suspense>
            )}
          </div>

          {card.models.length > 1 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/6 px-4 py-3">
              {card.models.map((m, i) => (
                <button
                  key={m.path}
                  onClick={() => setIndex(i)}
                  title={m.path.split("/").pop()}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border transition ${i === index ? "border-white/60 bg-white/8" : "border-white/6 hover:border-white/20"}`}
                >
                  <img src={previewUrl(m)} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="w-[22rem] shrink-0 overflow-y-auto border-l border-white/6 bg-ink-950/40 p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            {model.dims && <Fact label="Size">{model.dims.map((v) => v.toFixed(2)).join(" × ")}</Fact>}
            {model.triangles != null && <Fact label="Triangles">{formatCount(model.triangles)}</Fact>}
            {model.animations != null && <Fact label="Animations">{model.animations || "None"}</Fact>}
            {card.models.length > 1 && <Fact label="Variants">{card.models.length}</Fact>}
            <div className="col-span-2">
              <Fact label="File">
                <span className="text-[0.8rem] break-all text-ink-300">{model.path}</span>
              </Fact>
            </div>
          </dl>

          <div className="mt-7 flex items-baseline justify-between">
            <h3 className="font-semibold tracking-[-0.01em]">Textures</h3>
            {textureFiles.length > 1 && (
              <button onClick={() => startJob("zip", textureFiles.map((t) => ({ ...t, name: t.name.slice(9) })), `${base}-textures`)} className="text-[0.82rem] text-ink-300 hover:text-ink-100">
                Download all {textureFiles.length}
              </button>
            )}
          </div>
          {textures.length === 0 ? (
            <p className="mt-2 text-[0.88rem] text-ink-400">This model has no textures of its own.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {textures.map((t) => (
                <a
                  key={t.path}
                  href={fileUrl(datasetById("textures"), t.path, true)}
                  title={`Download ${t.path.split("/").pop()}`}
                  className="group overflow-hidden rounded-full border border-white/6 transition hover:border-white/20"
                >
                  <div className="checker relative flex aspect-square items-center justify-center">
                    {t.path.endsWith(".png") ? (
                      <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-ink-600" />
                    )}
                    <span className="absolute right-1.5 bottom-1.5 flex h-7 w-7 items-center justify-center rounded-[8px] bg-black/60 opacity-0 transition group-hover:opacity-100">
                      <Download size={13} />
                    </span>
                  </div>
                  <div className="px-2.5 py-2 leading-tight">
                    <div className="truncate text-[0.8rem] capitalize">{textureLabel(t.path)}</div>
                    {t.entry && <div className="mt-0.5 text-[0.72rem] text-ink-400">{formatSize(t.entry.size)}</div>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// axe_body_color_psd_dc021791.png -> axe body color
const textureLabel = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.(png|exr)$/, "")
    .replace(/_[0-9a-f]{6,8}$/, "")
    .replace(/_(psd|tga|png|jpg|vmat_g_\w+)$/, "")
    .replace(/_/g, " ");

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-[0.82rem] text-ink-400">{label}</dt>
      <dd className="mt-1 text-[1rem]">{children}</dd>
    </div>
  );
}
