import { Check, CircleAlert, LoaderCircle, X } from "lucide-react";
import { dismissJob, useJobs } from "../lib/jobs.js";
import { formatCount, formatSize } from "../lib/format.js";

export default function Tray() {
  const jobs = useJobs();
  if (!jobs.length) return null;
  return (
    <div className="fixed right-5 bottom-20 flex w-80 flex-col gap-2">
      {jobs.map((job) => {
        const share = job.total ? Math.min(1, job.bytes / job.total) : 0;
        const running = job.status === "running";
        return (
          <div key={job.id} className="rounded-xl border border-ink-700 bg-ink-850/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex items-center gap-2.5">
              {running ? (
                <LoaderCircle size={15} className="animate-spin text-ink-300" />
              ) : job.status === "done" ? (
                <Check size={15} className="text-emerald-400" />
              ) : (
                <CircleAlert size={15} className="text-accent" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">
                {job.title}
                {job.mode === "zip" ? ".zip" : "/"}
              </span>
              <button
                onClick={() => (running ? job.abort() : dismissJob(job.id))}
                title={running ? "Cancel" : "Dismiss"}
                className="flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:bg-ink-700 hover:text-ink-100"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink-700">
              <div className={`h-full rounded-full transition-[width] ${running ? "bg-ink-100" : job.status === "done" ? "bg-emerald-400" : "bg-accent"}`} style={{ width: `${share * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-ink-400 tabular-nums">
              <span>
                {formatCount(job.done)} / {formatCount(job.count)} files
              </span>
              <span>{job.status === "running" || job.status === "done" ? `${formatSize(job.bytes)} / ${formatSize(job.total)}` : job.status}</span>
            </div>
            {job.error && job.status === "failed" && <div className="mt-1.5 truncate text-[11px] text-accent">{job.error}</div>}
          </div>
        );
      })}
    </div>
  );
}
