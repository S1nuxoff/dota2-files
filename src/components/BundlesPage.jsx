import { formatCount } from "../lib/format.js";
import { CosmeticsTabs, Kind } from "./CosmeticsPage.jsx";
import { Spinner, LoadingList } from "./ui.jsx";

// Every bundle: what the game sells or gives as one item and opens into several (most often a hero's
// set), by hero, searched and sorted; one opens to its items' models together
export default function BundlesPage({ catalog }) {
  if (!catalog) return <LoadingList title="Bundles" tabs={<CosmeticsTabs current="/bundles" />} />;
  const n = Object.values(catalog.items).filter((i) => i.prefab === "bundle").length;
  return (
    <Kind
      prefab="bundle"
      catalog={catalog}
      tab="/bundles"
      title="Bundles"
      sub={`${formatCount(n)} bundles: several items sold or given as one, most often a hero's set. Each opens to its items, worn together.`}
    />
  );
}
