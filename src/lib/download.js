import { downloadZip } from "client-zip";
import { fileUrl, datasetById } from "../datasets.js";

// Downloads of many files at once, straight from the datasets: as one ZIP made in the browser, or
// file by file into a folder the user picks. Where the browser lets a page write to disk (Chromium's
// File System Access), the ZIP streams to the file, so its size has no limit; elsewhere it is built
// in memory first.

export const canStreamZip = () => typeof window.showSaveFilePicker === "function";
export const canSaveToFolder = () => typeof window.showDirectoryPicker === "function";

function counted(res, onBytes) {
  const counter = new TransformStream({
    transform(chunk, controller) {
      onBytes(chunk.byteLength);
      controller.enqueue(chunk);
    },
  });
  return new Response(res.body.pipeThrough(counter));
}

async function get(file, signal) {
  const res = await fetch(fileUrl(datasetById(file.ds), file.path), { signal });
  if (!res.ok) throw new Error(`${res.status} on ${file.path}`);
  return res;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// files: [{ ds, path, size, name }] where name is the path inside the ZIP. progress({ bytes, files })
export async function zipFiles(files, zipName, { signal, progress }) {
  // Asked first, while the click still counts as the user's gesture
  const handle = canStreamZip()
    ? await window.showSaveFilePicker({ suggestedName: zipName, types: [{ description: "ZIP archive", accept: { "application/zip": [".zip"] } }] })
    : null;
  let bytes = 0;
  let done = 0;
  async function* inputs() {
    for (const file of files) {
      const res = await get(file, signal);
      yield { name: file.name, input: counted(res, (n) => progress({ bytes: (bytes += n), files: done })), size: file.size };
      done++;
    }
  }
  const zip = downloadZip(inputs());
  if (handle) {
    await zip.body.pipeTo(await handle.createWritable(), { signal });
  } else {
    saveBlob(await zip.blob(), zipName);
  }
  progress({ bytes, files: files.length });
}

export async function saveToFolder(files, { signal, progress }) {
  const root = await window.showDirectoryPicker({ mode: "readwrite" });
  const dirs = new Map([["", root]]);
  async function dirFor(path) {
    if (!dirs.has(path)) {
      const cut = path.lastIndexOf("/");
      const parent = await dirFor(cut < 0 ? "" : path.slice(0, cut));
      dirs.set(path, parent.getDirectoryHandle(path.slice(cut + 1), { create: true }));
    }
    return dirs.get(path);
  }
  let bytes = 0;
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < files.length && !signal.aborted) {
      const file = files[next++];
      const cut = file.name.lastIndexOf("/");
      const dir = await dirFor(cut < 0 ? "" : file.name.slice(0, cut));
      const handle = await dir.getFileHandle(file.name.slice(cut + 1), { create: true });
      const res = await get(file, signal);
      await counted(res, (n) => progress({ bytes: (bytes += n), files: done })).body.pipeTo(await handle.createWritable(), { signal });
      done++;
      progress({ bytes, files: done });
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  signal.throwIfAborted();
}
