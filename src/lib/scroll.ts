export const scrollToId = (id: string, options: ScrollIntoViewOptions = {}) => {
  if (typeof window === "undefined") return;
  const target = document.getElementById(id);
  if (!target) return;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

  target.scrollIntoView({
    behavior,
    block: options.block ?? "start",
    inline: options.inline ?? "nearest",
  });
};
