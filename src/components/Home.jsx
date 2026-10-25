import { ArrowUpRight, Search } from "lucide-react";
import { DATASETS, OWNER } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import CopyButton from "./CopyButton.jsx";
import { link } from "../lib/route.js";
import { openPalette } from "../lib/palette.js";
import { Page, PageHead, Section } from "./ui.jsx";

// The raw files: the eight datasets as a list of folders, and how to get a whole one
export default function Home({ indexes, errors }) {
  const loaded = Object.values(indexes);
  const files = loaded.reduce((s, i) => s + i.count, 0);
  const bytes = loaded.reduce((s, i) => s + i.size, 0);
  const everything = DATASETS.map((d) => `hf download ${OWNER}/${d.repo} --repo-type dataset --local-dir ${d.repo}`).join("\n");
  const biggest = Math.max(1, ...loaded.map((i) => i.size));

  return (
    <Page>
      <PageHead
        title="Files"
        sub={`${loaded.length ? `${formatCount(files)} files, ${formatSize(bytes)}: e` : "E"}very picture, model, texture, sound, video, effect, map and script of the game, in eight datasets, by folder.`}
        actions={
          <button
            onClick={() => openPalette()}
            className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-ink-900 px-3.5 text-[0.9rem] text-ink-400 transition-colors hover:border-white/[0.16] hover:text-ink-200 max-md:w-full"
          >
            <Search size={16} /> Search every file
          </button>
        }
      />

      <div className="page-x pt-6 sm:pt-10 lg:pt-12">
        <ul className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
          {DATASETS.map((ds, i) => {
            const Icon = ds.icon;
            const index = indexes[ds.id];
            return (
              <li key={ds.id} className="anim-card border-white/[0.05] not-first:border-t" style={{ animationDelay: `${i * 35}ms` }}>
                <a href={link(`/${ds.id}`)} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:grid-cols-[auto_1fr_12rem_auto] sm:gap-5 sm:px-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-ink-850">
                    <Icon size={19} strokeWidth={1.6} className="text-ink-200" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[1rem] font-medium">{ds.title}</span>
                      <span className="hidden font-mono text-[0.74rem] text-ink-500 sm:inline">{ds.repo}</span>
                    </span>
                    <span className="mt-0.5 block text-[0.86rem] leading-snug text-ink-400">{ds.blurb}</span>
                  </span>
                  <span className="hidden text-right text-[0.8rem] text-ink-400 tabular-nums sm:block">
                    {index ? (
                      <>
                        <span className="block text-ink-200">{formatSize(index.size)}</span>
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-ink-800">
                          <span className="block h-full rounded-full bg-ink-400" style={{ width: `${Math.max(2, (index.size / biggest) * 100)}%` }} />
                        </span>
                        <span className="mt-1.5 block">{formatCount(index.count)} files</span>
                      </>
                    ) : errors[ds.id] ? (
                      "Could not be loaded"
                    ) : (
                      "Counting"
                    )}
                  </span>
                  <ArrowUpRight size={18} className="text-ink-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-100" />
                </a>
              </li>
            );
          })}
        </ul>

        <Section
          className="mt-16"
          title="A whole dataset at once"
          sub="Folders and picked files download as one ZIP right here. For a whole dataset, tens of gigabytes, the Hugging Face command line is faster and resumes."
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
              </span>
              <span className="flex-1 text-[0.8rem] text-ink-500">Terminal, after pip install -U huggingface_hub</span>
              <CopyButton text={everything} />
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-ink-300 sm:p-5">{everything}</pre>
          </div>
        </Section>
      </div>
    </Page>
  );
}
