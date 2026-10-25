import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp, LoaderCircle, ScanSearch, X } from "lucide-react";
import { searchByImage } from "../lib/visual.js";

// A screenshot (pasted, dropped or picked), a frame drawn round the thing to find, and the models
// that look most like it
export default function ImageSearch({ onResults, onClose }) {
  const [image, setImage] = useState(null); // { url, width, height, blob }
  const [rect, setRect] = useState(null); // in the picture's own pixels
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const shown = useRef(null);
  const drag = useRef(null);

  const take = useCallback((blob) => {
    if (!blob || !blob.type.startsWith("image/")) return;
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      setImage((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url, width: img.naturalWidth, height: img.naturalHeight, blob };
      });
      setRect(null);
      setError("");
    };
    img.src = url;
  }, []);

  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
      if (item) take(item.getAsFile());
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [take, onClose]);

  // From a point on the screen to the picture's pixels
  const toImage = (e) => {
    const box = shown.current.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - box.left, 0), box.width);
    const y = Math.min(Math.max(e.clientY - box.top, 0), box.height);
    return [(x / box.width) * image.width, (y / box.height) * image.height];
  };
  const onDown = (e) => {
    e.preventDefault();
    drag.current = toImage(e);
    setRect(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const [x0, y0] = drag.current;
    const [x1, y1] = toImage(e);
    setRect({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) });
  };
  const onUp = () => {
    drag.current = null;
    setRect((r) => (r && r.w > 8 && r.h > 8 ? r : null));
  };

  const find = async () => {
    setError("");
    setBusy("Getting ready…");
    try {
      const r = rect || { x: 0, y: 0, w: image.width, h: image.height };
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(r.w);
      canvas.height = Math.round(r.h);
      const img = new Image();
      img.src = image.url;
      await img.decode();
      canvas.getContext("2d").drawImage(img, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const results = await searchByImage(blob, {
        onProgress: (share, bytes) =>
          setBusy(`Downloading the image model (once, about 90 MB): ${share == null ? `${Math.round(bytes / 1e6)} MB` : `${Math.round(share * 100)}%`}`),
      });
      onResults(results, canvas.toDataURL("image/jpeg", 0.8));
    } catch (e) {
      setError(String(e.message || e));
      setBusy("");
    }
  };

  const box = image && rect && { left: `${(rect.x / image.width) * 100}%`, top: `${(rect.y / image.height) * 100}%`, width: `${(rect.w / image.width) * 100}%`, height: `${(rect.h / image.height) * 100}%` };

  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8 backdrop-blur-sm" onClick={onClose}>
      <div className="anim-open flex max-h-full w-full max-w-5xl flex-col rounded-3xl border border-white/[0.08] bg-ink-900 shadow-2xl shadow-black/60" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <ScanSearch size={18} className="text-accent" />
          <div className="flex-1">
            <div className="font-medium">Search by picture</div>
            <div className="text-sm text-ink-400">Paste a screenshot (Ctrl+V), drop it here, or pick a file. Then draw a frame round the thing you look for.</div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-850 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>

        <div
          className="flex min-h-0 flex-1 items-center justify-center p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            take(e.dataTransfer.files[0]);
          }}
        >
          {image ? (
            <div ref={shown} className="relative max-h-[60vh] cursor-crosshair touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
              <img src={image.url} alt="" draggable={false} className="block max-h-[60vh] max-w-full" />
              {box && (
                <div className="pointer-events-none absolute border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" style={box} />
              )}
            </div>
          ) : (
            <label className="flex h-72 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-700 text-ink-400 transition hover:border-ink-600 hover:text-ink-300">
              <ImageUp size={34} strokeWidth={1.25} />
              <span className="text-sm">Paste with Ctrl+V, drop a picture here, or click to pick one</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => take(e.target.files[0])} />
            </label>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-white/[0.06] px-6 py-4">
          <div className="min-w-0 flex-1 text-sm text-ink-400">
            {error ? (
              <span className="text-accent">{error}</span>
            ) : busy ? (
              <span className="flex items-center gap-2">
                <LoaderCircle size={14} className="animate-spin" /> {busy}
              </span>
            ) : image ? (
              rect ? "The framed part will be searched. Draw again to change it." : "Draw a frame round one thing for the best results, or search the whole picture."
            ) : (
              "Works best on one object: a tree, a rock, a courier, an item."
            )}
          </div>
          {image && (
            <label className="cursor-pointer text-sm text-ink-400 hover:text-ink-100">
              Another picture
              <input type="file" accept="image/*" className="hidden" onChange={(e) => take(e.target.files[0])} />
            </label>
          )}
          <button
            disabled={!image || !!busy}
            onClick={find}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink-100 px-4 text-sm font-medium text-ink-950 transition hover:bg-white disabled:opacity-40"
          >
            <ScanSearch size={16} /> Find similar models
          </button>
        </div>
      </div>
    </div>
  );
}
