export function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export const formatCount = (n) => n.toLocaleString("en-US");

const EXT_KIND = {
  png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image", svg: "image",
  webm: "video", mp4: "video", mov: "video",
  mp3: "audio", wav: "audio", ogg: "audio",
  glb: "model", gltf: "model",
  json: "text", txt: "text", vtt: "text", md: "text", mks: "text", xml: "text", css: "text", js: "text",
  res: "text", vdf: "text", lst: "text", cfg: "text", htm: "text", html: "text", styles: "text", vcdlist: "text", qc: "text",
};

export const KINDS = [
  { id: "image", title: "Images" },
  { id: "model", title: "Models" },
  { id: "audio", title: "Audio" },
  { id: "video", title: "Video" },
  { id: "text", title: "Text" },
  { id: "other", title: "Other" },
];

export function extOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export const kindOf = (name) => EXT_KIND[extOf(name)] || "other";
