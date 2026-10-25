import { DOTADEX } from "../datasets.js";
import { link } from "../lib/route.js";
import { DATASETS_URL, SOURCE_URL, SUPPORT_URL } from "./TopBar.jsx";

const COLUMNS = [
  ["Browse", [["/heroes", "Heroes"], ["/sets", "Sets"], ["/bundles", "Bundles"], ["/cosmetics/treasures", "Treasures"], ["/music", "Music"]]],
  ["Files", [["/3d", "3D models"], ["/cosmetics", "Cosmetics"], ["/files", "Datasets"], [DATASETS_URL, "Hugging Face"]]],
  ["Project", [[DOTADEX, "Dotadex"], [SOURCE_URL, "Source code"], [SUPPORT_URL, "Support the author"]]],
];

// Every page ends with the site's map: the ways into it, where the files come from, whose game it is
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="page-x grid gap-10 py-12 sm:grid-cols-2 sm:py-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dotadex" width="875" height="113" className="h-3.5 w-auto opacity-90" />
          <p className="mt-4 max-w-xs text-[0.86rem] leading-relaxed text-ink-400">
            Every file of Dota 2, sorted, linked and free to download. Updated after every patch.
          </p>
        </div>
        {COLUMNS.map(([head, links]) => (
          <div key={head}>
            <div className="text-[0.82rem] font-medium text-ink-500">{head}</div>
            <ul className="mt-3 space-y-2.5 text-[0.9rem]">
              {links.map(([href, label]) => {
                const outside = href.startsWith("http");
                return (
                  <li key={label}>
                    <a href={outside ? href : link(href)} {...(outside ? { target: "_blank", rel: "noreferrer" } : {})} className="text-ink-300 transition-colors hover:text-ink-100">
                      {label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="page-x border-t border-white/[0.04] py-6 text-[0.78rem] text-ink-500">
        Dota 2 content and materials are trademarks and copyrights of Valve. Not affiliated with Valve. Non-commercial.
      </div>
    </footer>
  );
}
