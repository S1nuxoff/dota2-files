import { useEffect, useState } from "react";

// The page grows with the screen (the root font size in index.css), so sizes the code works with in
// pixels (virtual lists' rows) are given in rem and multiplied by this
const read = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

export function useRem() {
  const [rem, setRem] = useState(read);
  useEffect(() => {
    const update = () => setRem(read());
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return rem;
}
