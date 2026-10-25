import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, FileArchive, Image as ImageIcon, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { Button } from "./ui.jsx";

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

  const stat = (label, value) => (
    <div className="flex justify-between gap-6">
      <span className="text-ink-400">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
  const tags = [card.heroName, model.group, model.theme, model.type].filter(Boolean);

  return createPortal(

    <div className="anim-fade fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={card.name} onClick={onClose}>
      <div className="anim-open absolute inset-5 grid grid-cols-[minmax(0,1fr)_25rem] gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,#3a3a3f_0%,#232326_45%,#161618_100%)]">
          <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(ellipse 45% 50% at 50% 50%, ${light}, transparent 70%)` }} />
          {entry && (
            <Suspense fallback={null}>
              <HeroViewer key={model.path} models={[entry]} bare />
            </Suspense>
          )}

          <div className="absolute top-4 left-4 flex gap-1.5">
            <button onClick={onPrev} title="Previous (Left arrow)" aria-label="Previous model" className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-ink-100 backdrop-blur transition-colors hover:bg-black/55">
              <ChevronLeft size={18} />
            </button>
            <button onClick={onNext} title="Next (Right arrow)" aria-label="Next model" className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-ink-100 backdrop-blur transition-colors hover:bg-black/55">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="absolute top-4 right-5 w-52 space-y-1.5 text-[0.86rem]">
            {model.triangles != null && stat("Triangles", formatCount(model.triangles))}
            {model.dims && stat("Size", model.dims.map((v) => v.toFixed(1)).join(" × "))}
            {model.animations != null && stat("Animations", model.animations || "None")}
          </div>

          {card.models.length > 1 && (
            <div className="absolute inset-x-0 bottom-5 flex justify-center">
              <div className="flex max-w-[75%] gap-1.5 overflow-x-auto rounded-2xl bg-black/40 p-1.5 backdrop-blur-md">
                {card.models.map((m, i) => (
                  <button
                    key={m.path}
                    onClick={() => setIndex(i)}
                    title={m.path.split("/").pop()}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl transition-colors ${i === index ? "bg-white/20 ring-1 ring-white/60" : "hover:bg-white/10"}`}
                  >
                    <img src={previewUrl(m)} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
          <div className="flex items-start gap-3 p-6 pb-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.4rem] leading-tight font-semibold tracking-[-0.025em] capitalize">{card.name}</h2>
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full bg-ink-800 px-3 py-1 text-[0.8rem] text-ink-300 capitalize">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} title="Close (Esc)" aria-label="Close" className="-mt-1 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
              <X size={19} />
            </button>
          </div>

          <div className="flex flex-col gap-2 p-6">
            <Button primary as="a" href={fileUrl(datasetById(model.ds), model.path, true)}>
              <Download size={16} /> Download glb <span className="font-normal opacity-55">{formatSize(entry?.size)}</span>
            </Button>
            {textureFiles.length > 0 && (
              <Button onClick={() => startJob("zip", withTextures, base)}>
                <FileArchive size={16} /> With its {textureFiles.length} textures, as ZIP
              </Button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.06] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">Textures</h3>
              {textureFiles.length > 1 && (
                <button onClick={() => startJob("zip", textureFiles.map((t) => ({ ...t, name: t.name.slice(9) })), `${base}-textures`)} className="text-[0.84rem] text-ink-400 hover:text-ink-100">
                  Download all
                </button>
              )}
            </div>
            {textures.length === 0 ? (
              <p className="mt-2 text-[0.88rem] text-ink-400">This model has no textures of its own.</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {textures.map((t, i) => (
                  <a
                    key={t.path}
                    href={fileUrl(datasetById("textures"), t.path, true)}
                    title={`Download ${t.path.split("/").pop()}`}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className="anim-card group overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-white/20"
                  >
                    <div className="checker relative flex aspect-square items-center justify-center">
                      {t.path.endsWith(".png") ? (
                        <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={22} className="text-ink-600" />
                      )}
                      <span className="absolute right-1 bottom-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <Download size={12} />
                      </span>
                    </div>
                    <div className="truncate px-2 py-1.5 text-[0.74rem] text-ink-300 capitalize">{textureLabel(t.path)}</div>
                  </a>
                ))}
              </div>
            )}
            <p className="mt-6 text-[0.78rem] break-all text-ink-400">{model.path}</p>
          </div>
        </aside>
      </div>
    </div>
    ,
    document.body
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
