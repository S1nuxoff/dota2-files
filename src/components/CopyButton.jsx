import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ text, label, className = "" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };
  const Icon = done ? Check : Copy;
  return (
    <button
      onClick={copy}
      title={label || "Copy"}
      className={`inline-flex h-8 items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-ink-100 ${className}`}
    >
      <Icon size={14} className={done ? "text-emerald-400" : ""} />
      {label && <span>{done ? "Copied" : label}</span>}
    </button>
  );
}
