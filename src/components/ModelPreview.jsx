import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import "@google/model-viewer";

// A model in <model-viewer>, from its gzipped copy where there is one (a third of the glb's size)
export default function ModelPreview({ url, gz }) {
  const viewer = useRef(null);
  const [src, setSrc] = useState(null);
  const [error, setError] = useState("");
  const [animations, setAnimations] = useState([]);
  const [animation, setAnimation] = useState("");

  useEffect(() => {
    let live = true;
    let blobUrl = null;
    (async () => {
      if (!gz) return setSrc(url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).blob();
      blobUrl = URL.createObjectURL(new Blob([blob], { type: "model/gltf-binary" }));
      if (live) setSrc(blobUrl);
    })().catch((e) => live && setError(String(e.message || e)));
    return () => {
      live = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url, gz]);

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    const onLoad = () => {
      const list = el.availableAnimations || [];
      setAnimations(list);
      const idle = list.find((n) => /idle/i.test(n)) || list[0] || "";
      setAnimation(idle);
    };
    const onError = () => setError("The model could not be shown");
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, [src]);

  useEffect(() => {
    const el = viewer.current;
    if (el && animation) {
      el.animationName = animation;
      el.play();
    }
  }, [animation]);

  if (error) return <div className="flex h-full items-center justify-center text-sm text-ink-400">{error}</div>;
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-ink-400">
        <LoaderCircle size={18} className="animate-spin" />
      </div>
    );
  }
  return (
    <div className="relative h-full">
      <model-viewer ref={viewer} src={src} camera-controls="" shadow-intensity="0.6" exposure="1.1" environment-image="neutral" interaction-prompt="none" />
      {animations.length > 0 && (
        <select
          value={animation}
          onChange={(e) => setAnimation(e.target.value)}
          className="absolute bottom-2 left-2 max-w-[60%] rounded-md border border-ink-700 bg-ink-900/90 px-2 py-1 text-xs text-ink-300 outline-none"
        >
          {animations.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      )}
    </div>
  );
}
