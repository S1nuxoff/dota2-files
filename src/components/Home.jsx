import { ArrowUpRight } from "lucide-react";
import { DATASETS, OWNER } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import CopyButton from "./CopyButton.jsx";
import { link } from "../lib/route.js";
import { PageHead } from "./ui.jsx";

// The raw files: the eight datasets, and how to get a whole one
export default function Home({ indexes, errors }) {
  const loaded = Object.values(indexes);
  const files = loaded.reduce((s, i) => s + i.count, 0);
  const bytes = loaded.reduce((s, i) => s + i.size, 0);
  const everything = DATASETS.map((d) => `hf download ${OWNER}/${d.repo} --repo-type dataset --local-dir ${d.repo}`).join("\n");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="anim-page">
        <PageHead
          title="All files"
          sub={`${formatCount(files)} files, ${formatSize(bytes)}: every picture, model, texture, sound, video, effect, map and script of the game, by folder.`}
        />
        <div className="mx-auto grid max-w-6xl grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4 px-8">
          {DATASETS.map((ds, i) => {
            const Icon = ds.icon;
            const index = indexes[ds.id];
            return (
              <a
                key={ds.id}
                href={link(`/${ds.id}`)}
                style={{ animationDelay: `${i * 30}ms` }}
                className="anim-card group flex flex-col rounded-2xl border border-white/[0.06] bg-ink-850 p-5 transition-colors hover:border-white/[0.14]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-800">
                    <Icon size={19} strokeWidth={1.6} className="text-ink-100" />
                  </span>
                  <ArrowUpRight size={17} className="text-ink-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-100" />
                </div>
                <div className="mt-5 text-[1.02rem] font-medium">{ds.title}</div>
                <p className="mt-1.5 flex-1 text-[0.86rem] leading-snug text-ink-400">{ds.blurb}</p>
                <div className="mt-5 text-[0.8rem] text-ink-400 tabular-nums">
                  {index ? `${formatCount(index.count)} files, ${formatSize(index.size)}` : errors[ds.id] ? "Its list could not be loaded" : "Counting"}
                </div>
              </a>
            );
          })}
        </div>

        <section className="mx-auto max-w-6xl px-8 pt-16 pb-20">
          <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">A whole dataset at once</h2>
          <p className="mt-2 max-w-2xl text-[0.92rem] text-ink-400">
            Folders and picked files download as one ZIP right here. For a whole dataset, tens of gigabytes, the Hugging Face command line is faster
            and resumes: install it with <code className="rounded bg-ink-800 px-1.5 py-0.5 text-ink-300">pip install -U huggingface_hub</code>, then run
          </p>
          <div className="relative mt-5 rounded-2xl border border-white/[0.06] bg-ink-900">
            <pre className="overflow-x-auto p-5 font-mono text-[0.8rem] leading-relaxed text-ink-300">{everything}</pre>
            <div className="absolute top-3 right-3">
              <CopyButton text={everything} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
