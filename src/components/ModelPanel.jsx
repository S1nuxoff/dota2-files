import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileArchive, Image as ImageIcon } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

const previewUrl = (m) => fileUrl(datasetById("models"), `previews/${m.path.slice(0, -4)}.webp`);

// One model card opened over the list: the model large in 3D, its variants under it, and beside it
// its measures and textures. Esc goes back, the arrow keys go through the list
export default function ModelPanel({ card, entries, onClose, onPrev, onNext }) {
  const [index, setIndex] = useState(0);
  const model = card.models[Math.min(index, card.models.length - 1)];
  const entry = entries.get(`${model.ds}:${model.path}`);
  const textures = model.textures.map((path) => ({ path, entry: entries.get(`textures:${path}`) }));
  const fileName = model.path.split("/").pop();
  const base = fileName.replace(/\.glb$/, "");
  const textureFiles = textures.filter((t) => t.entry).map((t) => ({ ds: "textures", path: t.path, size: t.entry.size, name: `textures/${t.path.split("/").pop()}` }));
  const withTextures = [{ ds: model.ds, path: model.path, size: entry?.size || 0, name: fileName }, ...textureFiles];

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const button = "inline-flex h-10 items-center gap-2 rounded-lg border border-ink-700 px-3.5 text-sm text-ink-300 transition hover:border-ink-600 hover:text-ink-100";

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-ink-950">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-800 px-5">
        <button onClick={onClose} className={button}>
          <ArrowLeft size={16} /> All models
        </button>
        <div className="flex">
          <button onClick={onPrev} title="Previous (Left arrow)" className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-850 hover:text-ink-100">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onNext} title="Next (Right arrow)" className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-850 hover:text-ink-100">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="min-w-0 flex-1 px-2">
          <div className="truncate text-xl font-semibold tracking-tight capitalize">{card.name}</div>
          <div className="truncate text-sm text-ink-400 capitalize">{[card.heroName, model.type, model.group, model.theme].filter(Boolean).join(" · ")}</div>
        </div>
        <a href={fileUrl(datasetById(model.ds), model.path, true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-100 px-4 text-sm font-medium text-ink-950 hover:bg-white">
          <Download size={16} /> {fileName} · {formatSize(entry?.size)}
        </a>
        {textureFiles.length > 0 && (
          <button onClick={() => startJob("zip", withTextures, base)} className={button}>
            <FileArchive size={16} /> With textures (ZIP)
          </button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            {entry && (
              <Suspense fallback={null}>
                <HeroViewer key={model.path} models={[entry]} />
              </Suspense>
            )}
          </div>
          {card.models.length > 1 && (
            <div className="shrink-0 border-t border-ink-800 px-5 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {card.models.map((m, i) => (
                  <button
                    key={m.path}
                    onClick={() => setIndex(i)}
                    title={m.path.split("/").pop()}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-ink-900 transition ${i === index ? "border-ink-300" : "border-ink-800 hover:border-ink-600"}`}
                  >
                    <img src={previewUrl(m)} alt="" loading="lazy" className="h-full w-full object-contain p-1" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="min-h-0 space-y-7 overflow-y-auto border-l border-ink-800 p-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            {model.dims && <Field label="Size">{model.dims.map((v) => v.toFixed(2)).join(" × ")}</Field>}
            {model.triangles != null && <Field label="Triangles">{formatCount(model.triangles)}</Field>}
            {model.animations != null && <Field label="Animations">{model.animations || "None"}</Field>}
            {card.models.length > 1 && <Field label="Variants">{card.models.length}</Field>}
            <div className="col-span-2">
              <Field label="Path">
                <span className="font-mono text-xs break-all text-ink-300">{model.path}</span>
              </Field>
            </div>
          </dl>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium tracking-wider text-ink-400 uppercase">Textures {textures.length > 0 && `· ${textures.length}`}</div>
              {textureFiles.length > 1 && (
                <button onClick={() => startJob("zip", textureFiles.map((t) => ({ ...t, name: t.name.slice(9) })), `${base}-textures`)} className="text-xs text-ink-400 hover:text-ink-100">
                  Download all
                </button>
              )}
            </div>
            {textures.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">{model.textures ? "No textures of its own, or not measured yet." : ""}</p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {textures.map((t) => (
                  <a
                    key={t.path}
                    href={fileUrl(datasetById("textures"), t.path, true)}
                    title={`Download ${t.path.split("/").pop()}`}
                    className="group overflow-hidden rounded-lg border border-ink-800 transition hover:border-ink-600"
                  >
                    <div className="checker relative flex aspect-square items-center justify-center">
                      {t.path.endsWith(".png") ? (
                        <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <ImageIcon size={26} className="text-ink-600" />
                      )}
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-ink-950/80 p-1.5 text-ink-300 opacity-0 transition group-hover:opacity-100">
                        <Download size={14} />
                      </span>
                    </div>
                    <div className="bg-ink-900 px-2.5 py-2 leading-tight">
                      <div className="truncate text-xs capitalize">{textureLabel(t.path)}</div>
                      {t.entry && <div className="mt-0.5 text-[11px] text-ink-400">{formatSize(t.entry.size)}</div>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
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

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs tracking-wider text-ink-400 uppercase">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
