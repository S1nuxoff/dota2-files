import { AudioLines, Box, Braces, Film, Image, Layers, Map as MapIcon, Sparkles } from "lucide-react";

// The tracker's Hugging Face datasets (dota2-game-tracker lib/datasets.js), in the order the site
// shows them. names: the dataset has names.json ({ path: [name, kind] }) next to its files.json
export const OWNER = "Sqls1";

export const DATASETS = [
  { id: "images", repo: "dota2-images", title: "Images", icon: Image, names: true, blurb: "Every picture of the interface: portraits, icons, item art, loading screens, emoticons." },
  { id: "models", repo: "dota2-models", title: "Models", icon: Box, names: true, blurb: "Every model as glb with its textures and animations, plus skins, sequences, cloth." },
  { id: "textures", repo: "dota2-textures", title: "Textures", icon: Layers, blurb: "Every texture outside the interface on its own, as PNG (EXR for HDR)." },
  { id: "sounds", repo: "dota2-sounds", title: "Sounds", icon: AudioLines, blurb: "Every sound: voice lines, music, abilities, the menu. Sound events and phonemes." },
  { id: "videos", repo: "dota2-videos", title: "Videos", icon: Film, blurb: "The interface's videos: animated hero portraits, intros, subtitles." },
  { id: "particles", repo: "dota2-particles", title: "Particles", icon: Sparkles, blurb: "Every particle system as JSON with its textures and the engine's schema." },
  { id: "maps", repo: "dota2-maps", title: "Maps", icon: MapIcon, blurb: "Scenes and maps as glb with their lights and cameras." },
  { id: "data", repo: "dota2-data", title: "Data", icon: Braces, blurb: "Every script and localization as JSON, Panorama layouts, styles, fonts." },
];

export const datasetById = (id) => DATASETS.find((d) => d.id === id);

// Dotadex, the site that shows heroes and items as the game does: /hero/<key>?persona=<n>, /item/<id>
export const DOTADEX = "https://s1nuxoff.github.io/Dotadex";

export const repoUrl = (ds) => `https://huggingface.co/datasets/${OWNER}/${ds.repo}`;

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

// download: Hugging Face answers with Content-Disposition: attachment, so a plain link saves the file
export const fileUrl = (ds, path, download = false) => `${repoUrl(ds)}/resolve/main/${encodePath(path)}${download ? "?download=true" : ""}`;

export const hubUrl = (ds, path, isDir = false) => `${repoUrl(ds)}/${isDir ? "tree" : "blob"}/main/${encodePath(path)}`;

// The Hub CLI command that downloads a folder (or the whole dataset) with resume, for big ones
export function cliCommand(ds, dir) {
  const include = dir ? ` --include "${dir}/*"` : "";
  return `hf download ${OWNER}/${ds.repo} --repo-type dataset${include} --local-dir ${ds.repo}`;
}
