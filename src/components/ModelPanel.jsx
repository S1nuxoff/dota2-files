import { lazy, Suspense, useState } from "react";
import { Download, FileArchive, Image as ImageIcon, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

const previewUrl = (m) => fileUrl(datasetById("models"), `previews/${m.path.slice(0, -4)}.webp`);

// One model card opened: the model in 3D, its variants, its measures, and its textures
export default function ModelPanel({ card, entries, onClose }) {
  const [index, setIndex] = useState(0);
  const model = card.models[Math.min(index, card.models.length - 1)];
  const entry = entries.get(`${model.ds}:${model.path}`);
  const textures = model.textures.map((path) => ({ path, entry: entries.get(`textures:${path}`) }));
  const fileName = model.path.split("/").pop();
  const withTextures = [
    { ds: model.ds, path: model.path, size: entry?.size || 0, name: fileName },
    ...textures.filter((t) => t.entry).map((t) => ({ ds: "textures", path: t.path, size: t.entry.size, name: `textures/${t.path.split("/").pop()}` })),
  ];

  return (
    <aside className="flex w-[480px] shrink-0 flex-col border-l border-ink-800 bg-ink-900/40">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-ink-800 pr-2 pl-5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{card.name}</span>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-850 hover:text-ink-100">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="h-80 border-b border-ink-800">
          {entry ? (
            <Suspense fallback={null}>
              <HeroViewer key={model.path} models={[entry]} />
            </Suspense>
          ) : null}
        </div>

        {card.models.length > 1 && (
          <div className="border-b border-ink-800 px-5 py-4">
            <div className="text-[11px] tracking-wider text-ink-400 uppercase">{card.models.length} variants</div>
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {card.models.map((m, i) => (
                <button
                  key={m.path}
                  onClick={() => setIndex(i)}
                  title={m.path.split("/").pop()}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-ink-850 ${i === index ? "border-ink-300" : "border-ink-800 hover:border-ink-600"}`}
                >
                  <img src={previewUrl(m)} alt="" loading="lazy" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5 p-5">
          <div className="flex flex-col gap-2">
            <a
              href={fileUrl(datasetById(model.ds), model.path, true)}
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-ink-100 text-sm font-medium text-ink-950 hover:bg-white"
            >
              <Download size={16} /> {fileName} · {formatSize(entry?.size)}
            </a>
            {textures.length > 0 && (
              <button
                onClick={() => startJob("zip", withTextures, fileName.replace(/\.glb$/, ""))}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-ink-700 text-sm text-ink-300 hover:border-ink-600 hover:text-ink-100"
              >
                <FileArchive size={15} /> With its {textures.length} textures (ZIP)
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Type">
              <span className="capitalize">{[model.type, model.group].filter(Boolean).join(" · ")}</span>
            </Field>
            {model.theme && (
              <Field label="Theme">
                <span className="capitalize">{model.theme}</span>
              </Field>
            )}
            {model.dims && <Field label="Size">{model.dims.map((v) => v.toFixed(2)).join(" × ")}</Field>}
            {model.triangles != null && <Field label="Triangles">{formatCount(model.triangles)}</Field>}
            {model.animations != null && <Field label="Animations">{model.animations || "none"}</Field>}
            <div className="col-span-2">
              <Field label="Path">
                <span className="font-mono text-xs break-all text-ink-300">{model.path}</span>
              </Field>
            </div>
          </dl>

          {textures.length > 0 && (
            <div>
              <div className="text-[11px] tracking-wider text-ink-400 uppercase">Textures</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {textures.map((t) => (
                  <a
                    key={t.path}
                    href={fileUrl(datasetById("textures"), t.path, true)}
                    title={`Download ${t.path.split("/").pop()}`}
                    className="group overflow-hidden rounded-md border border-ink-800 hover:border-ink-600"
                  >
                    <div className="checker relative flex aspect-square items-center justify-center">
                      {t.path.endsWith(".png") ? (
                        <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <ImageIcon size={22} className="text-ink-600" />
                      )}
                      <span className="absolute top-1 right-1 rounded bg-ink-950/80 p-1 text-ink-300 opacity-0 group-hover:opacity-100">
                        <Download size={12} />
                      </span>
                    </div>
                    <div className="truncate bg-ink-900 px-1.5 py-1 text-[10.5px] text-ink-400">{textureLabel(t.path)}</div>
                    {t.entry && <div className="bg-ink-900 px-1.5 pb-1 text-[10px] text-ink-600">{formatSize(t.entry.size)}</div>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
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
      <dt className="text-[11px] tracking-wider text-ink-400 uppercase">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
