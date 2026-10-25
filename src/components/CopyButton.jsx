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
      className={`inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-850 px-2.5 text-[0.8rem] text-ink-300 transition-colors hover:border-white/[0.16] hover:text-ink-100 ${className}`}
    >
      <Icon size={14} className={done ? "text-emerald-400" : ""} />
      {label && <span>{done ? "Copied" : label}</span>}
    </button>
  );
}
