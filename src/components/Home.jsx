import { ArrowRight } from "lucide-react";
import { DATASETS, OWNER } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import CopyButton from "./CopyButton.jsx";

export default function Home({ indexes, errors }) {
  const loaded = Object.values(indexes);
  const files = loaded.reduce((s, i) => s + i.count, 0);
  const bytes = loaded.reduce((s, i) => s + i.size, 0);
  const everything = DATASETS.map((d) => `hf download ${OWNER}/${d.repo} --repo-type dataset --local-dir ${d.repo}`).join("\n");

  return (
    <div className="overflow-y-auto">
      <div className="mx-auto max-w-5xl px-10 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Every file of Dota 2</h1>
        <p className="mt-3 max-w-2xl text-ink-300">
          Pictures, models, textures, sounds, videos, particles, maps and scripts, exported from the game after every update. Browse, preview and
          download any file, any folder, or a whole dataset.
        </p>
        <div className="mt-6 flex gap-8 text-sm text-ink-400">
          <span>
            <span className="text-ink-100 tabular-nums">{formatCount(files)}</span> files
          </span>
          <span>
            <span className="text-ink-100 tabular-nums">{formatSize(bytes)}</span>
          </span>
          {loaded.length < DATASETS.length && <span>loading {DATASETS.length - loaded.length} more…</span>}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {DATASETS.map((ds) => {
            const Icon = ds.icon;
            const index = indexes[ds.id];
            return (
              <a
                key={ds.id}
                href={`#/${ds.id}`}
                className="group flex flex-col rounded-xl border border-ink-800 bg-ink-900 p-5 transition hover:border-ink-600 hover:bg-ink-850"
              >
                <div className="flex items-center justify-between">
                  <Icon size={20} strokeWidth={1.5} className="text-ink-300 group-hover:text-accent" />
                  <ArrowRight size={15} className="text-ink-600 transition group-hover:translate-x-0.5 group-hover:text-ink-300" />
                </div>
                <div className="mt-5 font-medium">{ds.title}</div>
                <p className="mt-1.5 flex-1 text-[13px] leading-snug text-ink-400">{ds.blurb}</p>
                <div className="mt-4 text-xs text-ink-400 tabular-nums">
                  {index ? `${formatCount(index.count)} files · ${formatSize(index.size)}` : errors[ds.id] ? "list unavailable" : "…"}
                </div>
              </a>
            );
          })}
        </div>

        <section className="mt-14">
          <h2 className="font-medium">Download everything</h2>
          <p className="mt-1.5 text-sm text-ink-400">
            Folders and picked files download as one ZIP right in the browser. For whole datasets (tens of gigabytes) the Hugging Face CLI is
            faster and resumes: <code className="text-ink-300">pip install -U huggingface_hub</code>, then:
          </p>
          <div className="relative mt-4 rounded-xl border border-ink-800 bg-ink-900">
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-ink-300">{everything}</pre>
            <div className="absolute top-3 right-3">
              <CopyButton text={everything} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
