import { useState } from "react";
import { AudioLines, Box, Braces, Check as CheckIcon, File, Film, Folder, Image } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";

const KIND_ICON = { image: Image, model: Box, audio: AudioLines, video: Film, text: Braces, other: File };

// What a file looks like, small: a model's preview (previews/<path>.webp in dota2-models), a
// picture itself; else the icon of its kind
function thumbOf(entry) {
  if (!entry) return "";
  if (entry.ext === "glb" && entry.ds === "models" && !entry.path.startsWith("previews/")) return fileUrl(datasetById("models"), `previews/${entry.path.slice(0, -4)}.webp`);
  if (entry.kind === "image" && ["png", "jpg", "jpeg", "webp", "svg"].includes(entry.ext) && entry.size < 3e6) return fileUrl(datasetById(entry.ds), entry.path);
  return "";
}

// size 16: a row's icon, shown as a small square thumbnail where there is one; larger: a grid cell's
export function EntryIcon({ entry, dir, size = 16 }) {
  const [broken, setBroken] = useState(false);
  const thumb = !dir && !broken && thumbOf(entry);
  if (thumb) {
    return size >= 24 ? (
      <img src={thumb} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="max-h-full max-w-full object-contain p-2" />
    ) : (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-800">
        <img src={thumb} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }
  const Icon = dir ? Folder : KIND_ICON[entry.kind] || File;
  return size >= 24 ? (
    <Icon size={size} strokeWidth={1.5} className="shrink-0 text-ink-400" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-850">
      <Icon size={size} strokeWidth={1.5} className={dir ? "text-ink-300" : "text-ink-400"} />
    </span>
  );
}

export function Check({ picked, onClick, boxed }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
        picked ? "border-ink-100 bg-ink-100 text-ink-950" : `border-ink-600 hover:border-ink-400 ${boxed ? "bg-ink-900/80" : ""}`
      }`}
    >
      {picked && <CheckIcon size={13} strokeWidth={3} />}
    </button>
  );
}
