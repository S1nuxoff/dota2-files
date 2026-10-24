import { useSyncExternalStore } from "react";
import { saveToFolder, zipFiles } from "./download.js";

// The running and finished downloads, shown in the tray
let jobs = [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const patch = (id, change) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...change } : j));
  emit();
};

let nextId = 1;

// mode: "zip" or "folder"; files: [{ ds, path, size, name }]
export function startJob(mode, files, title) {
  const id = nextId++;
  const controller = new AbortController();
  const total = files.reduce((s, f) => s + f.size, 0);
  let added = false;
  let last = 0;
  const progress = ({ bytes, files: done }) => {
    const now = performance.now();
    if (now - last < 100 && done < files.length) return;
    last = now;
    if (!added) return;
    patch(id, { bytes, done });
  };
  const add = () => {
    if (added) return;
    added = true;
    jobs = [{ id, title, mode, total, count: files.length, bytes: 0, done: 0, status: "running", abort: () => controller.abort() }, ...jobs];
    emit();
  };
  const options = { signal: controller.signal, progress: (p) => (add(), progress(p)) };
  const run = mode === "zip" ? zipFiles(files, `${title}.zip`, options) : saveToFolder(files, options);
  // The picker comes first: the job shows once a place is chosen (the first progress) or it ends
  run.then(
    () => (add(), patch(id, { status: "done", bytes: total, done: files.length })),
    (error) => {
      if (error?.name === "AbortError" && !added) return; // the picker was closed
      add();
      patch(id, { status: controller.signal.aborted ? "cancelled" : "failed", error: String(error?.message || error) });
    }
  );
}

export function dismissJob(id) {
  jobs = jobs.filter((j) => j.id !== id);
  emit();
}

export const useJobs = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => jobs
  );
