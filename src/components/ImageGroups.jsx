import { Progressive } from "./ui.jsx";
import { useMemo } from "react";
import { formatCount } from "../lib/format.js";
import { navigate } from "../lib/route.js";
import { Cell, withSizes } from "./FileTable.jsx";

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
    for (const e of withSizes(files)) by.get(kindOf(e.path)).push(e);
    return [...by.entries()].filter(([, l]) => l.length);
  }, [files]);
  const keyOf = (e) => `${e.ds}:${e.path}`;

  return (
    <div className="space-y-10">
      {groups.map(([kind, list]) => (
        <section key={kind}>
          <h3 className="text-center text-[1.3rem] font-semibold tracking-[-0.03em]">
            {kind} <span className="ml-1 font-normal text-ink-400">{formatCount(list.length)}</span>
          </h3>
          <Progressive
            items={list}
            step={60}
            className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(13rem,16rem))] sm:justify-center"
            render={(e) => <Cell key={keyOf(e)} e={e} active={route.file === keyOf(e)} onOpen={() => navigate({ ...route, file: keyOf(e) })} />}
          />
        </section>
      ))}
      {groups.length === 0 && <p className="py-10 text-center text-ink-400">No pictures.</p>}
    </div>
  );
}
