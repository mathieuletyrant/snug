import { useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";

/** A new page (path or query, e.g. an integration's `?app=`) opens at the top; Back and Forward keep the position the browser restores. */
export function useScrollToTop() {
  const [location] = useLocation();
  const search = useSearch();
  const popped = useRef(false);
  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (!popped.current) window.scrollTo(0, 0);
    popped.current = false;
  }, [location, search]);
}
