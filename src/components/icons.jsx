import { AudioLines, Box, Braces, Check as CheckIcon, File, Film, Folder, Image } from "lucide-react";

const KIND_ICON = { image: Image, model: Box, audio: AudioLines, video: Film, text: Braces, other: File };

export function EntryIcon({ entry, dir, size = 16 }) {
  const Icon = dir ? Folder : KIND_ICON[entry.kind] || File;
  return <Icon size={size} strokeWidth={1.5} className={`shrink-0 ${dir ? "text-ink-300" : "text-ink-400"}`} />;
}

export function Check({ picked, onClick, boxed }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 items-center justify-center rounded border transition ${
        picked ? "border-accent bg-accent text-white" : `border-ink-600 hover:border-ink-400 ${boxed ? "bg-ink-900/80" : ""}`
      }`}
    >
      {picked && <CheckIcon size={13} strokeWidth={3} />}
    </button>
  );
}
