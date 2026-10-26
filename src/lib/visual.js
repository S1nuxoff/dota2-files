import { datasetById, fileUrl } from "../datasets.js";

// Search by picture and by words: the tracker's embeddings of every model preview
// (exporters/embeddings.js: previews/embeddings.json and .bin in dota2-models), and the same CLIP
// model run in the browser on a piece of a screenshot or a few words; the nearest vectors win.
// The model (about 90 MB for pictures, 65 MB for words) downloads on first use and stays cached.
// All of it runs in a worker (visual.worker.js), so the page keeps moving while it thinks
let worker = null;
let nextId = 0;
const pending = new Map();

function ask(kind, input, { count = 200, onProgress } = {}) {
  if (!worker) {
    worker = new Worker(new URL("./visual.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.progress) return job.progress(...data.progress);
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.results);
    };
  }
  const ds = datasetById("models");
  const urls = { json: fileUrl(ds, "previews/embeddings.json"), bin: fileUrl(ds, "previews/embeddings.bin") };
  // The download reports many times a second: the page hears of it at most every 200 ms
  let last = 0;
  const progress = (share, bytes) => {
    const now = performance.now();
    if (now - last < 200 && share !== 1) return;
    last = now;
    onProgress?.(share, bytes);
  };
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, progress });
    worker.postMessage({ id, kind, input, urls, count });
  });
}

// A picture (a Blob: the chosen piece of a screenshot), laid on the grey the previews were laid on
export const searchByImage = (blob, options) => ask("image", blob, options);

export const searchByWords = (words, options) => ask("words", words, options);
