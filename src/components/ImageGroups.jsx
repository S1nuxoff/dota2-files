import { useMemo } from "react";
import { formatCount } from "../lib/format.js";
import { navigate } from "../lib/route.js";
import { Cell } from "./FileTable.jsx";

// The game's picture folders, named for people (panorama/images/...): the first that fits
const KINDS = [
  [/\/images\/heroes\//, "Hero portraits"],
  [/\/econ\/heroes\//, "Cosmetic renders"],
  [/\/spellicons\//, "Abilities"],
  [/\/econ\/sets\//, "Sets"],
  [/\/econ\/loading_screens\//, "Loading screens"],
  [/\/econ\/items\//, "Cosmetic items"],
  [/\/images\/items\//, "Shop items"],
  [/\/(emoticons|sprays)\//, "Emoticons and sprays"],
  [/\/econ\/announcer/, "Announcers"],
  [/\/(events|leaf_pages|cavern)\//, "Events"],
];
const kindOf = (path) => KINDS.find(([re]) => re.test(path))?.[1] || "Other";

// A hero's pictures, grouped by what they are, each opening in the file window
export default function ImageGroups({ files, route }) {
  const groups = useMemo(() => {
    const by = new Map(KINDS.map(([, k]) => [k, []]));
    by.set("Other", []);
    for (const e of files) by.get(kindOf(e.path)).push(e);
    return [...by.entries()].filter(([, l]) => l.length);
  }, [files]);
  const keyOf = (e) => `${e.ds}:${e.path}`;

  return (
    <div className="space-y-10">
      {groups.map(([kind, list]) => (
        <section key={kind}>
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">
            {kind} <span className="ml-1 font-normal text-ink-400">{formatCount(list.length)}</span>
          </h3>
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
            {list.map((e) => (
              <Cell key={keyOf(e)} e={e} active={route.file === keyOf(e)} onOpen={() => navigate({ ...route, file: keyOf(e) })} />
            ))}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="py-10 text-center text-ink-400">No pictures.</p>}
    </div>
  );
}
