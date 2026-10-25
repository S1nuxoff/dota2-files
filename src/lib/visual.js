import { datasetById, fileUrl } from "../datasets.js";

// Search by picture and by words: the tracker's embeddings of every model preview
// (exporters/embeddings.js: previews/embeddings.json and .bin in dota2-models), and the same CLIP
// model run in the browser on a piece of a screenshot or a few words; the nearest vectors win.
// The model (about 90 MB for pictures, 65 MB for words) downloads on first use and stays cached.
let indexPromise = null;
let visionPromise = null;
let textPromise = null;

export function loadIndex() {
  indexPromise ??= (async () => {
    const ds = datasetById("models");
    const [meta, bin] = await Promise.all([
      fetch(fileUrl(ds, "previews/embeddings.json")).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))),
      fetch(fileUrl(ds, "previews/embeddings.bin")).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))),
    ]);
    const stride = 4 + meta.dim;
    const view = new DataView(bin);
    const scales = new Float32Array(meta.paths.length);
    const values = new Int8Array(bin);
    for (let i = 0; i < meta.paths.length; i++) scales[i] = view.getFloat32(i * stride, true);
    // A preview's model: previews/<path>.webp (the cards' view) or previews/top/<path>.webp (the
    // match's view) -> <path>.glb
    const models = meta.paths.map((p) => `${p.slice("previews/".length, -".webp".length).replace(/^top\//, "")}.glb`);
    return { meta, stride, scales, values, models };
  })();
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

async function library(onProgress) {
  const lib = await import("@huggingface/transformers");
  // The Hub does not always say a file's size: then only how much has come
  return { lib, progress: (p) => p.status === "progress" && onProgress?.(p.total ? p.loaded / p.total : null, p.loaded) };
}

function vision(model, dtype, onProgress) {
  visionPromise ??= (async () => {
    const { lib, progress } = await library(onProgress);
    const processor = await lib.AutoProcessor.from_pretrained(model);
    const encoder = await lib.CLIPVisionModelWithProjection.from_pretrained(model, { dtype, progress_callback: progress });
    return { lib, processor, encoder };
  })();
  visionPromise.catch(() => (visionPromise = null));
  return visionPromise;
}

function text(model, dtype, onProgress) {
  textPromise ??= (async () => {
    const { lib, progress } = await library(onProgress);
    const tokenizer = await lib.AutoTokenizer.from_pretrained(model);
    const encoder = await lib.CLIPTextModelWithProjection.from_pretrained(model, { dtype, progress_callback: progress });
    return { tokenizer, encoder };
  })();
  textPromise.catch(() => (textPromise = null));
  return textPromise;
}

// The models nearest to a vector: [{ path, score }], best first
function nearest(index, vector, count) {
  const { stride, scales, values, models, meta } = index;
  const dim = meta.dim;
  const scores = new Float32Array(models.length);
  for (let i = 0; i < models.length; i++) {
    let dot = 0;
    const at = i * stride + 4;
    for (let k = 0; k < dim; k++) dot += values[at + k] * vector[k];
    scores[i] = dot * scales[i];
  }
  // A model seen from two sides counts once, by its nearer view
  const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]);
  const seen = new Set();
  const out = [];
  for (const i of order) {
    if (seen.has(models[i])) continue;
    seen.add(models[i]);
    out.push({ path: models[i], score: scores[i] });
    if (out.length >= count) break;
  }
  return out;
}

// A picture (a Blob: the chosen piece of a screenshot), laid on the grey the previews were laid on
export async function searchByImage(blob, { count = 200, onProgress } = {}) {
  const index = await loadIndex();
  const { lib, processor, encoder } = await vision(index.meta.model, index.meta.dtype, onProgress);
  const image = await lib.RawImage.fromBlob(blob);
  const { image_embeds } = await encoder(await processor(image));
  return nearest(index, image_embeds.normalize(2, -1).tolist()[0], count);
}

export async function searchByWords(words, { count = 200, onProgress } = {}) {
  const index = await loadIndex();
  const { tokenizer, encoder } = await text(index.meta.model, index.meta.dtype, onProgress);
  const { text_embeds } = await encoder(tokenizer([`a 3D model of ${words}`], { padding: true, truncation: true }));
  return nearest(index, text_embeds.normalize(2, -1).tolist()[0], count);
}
