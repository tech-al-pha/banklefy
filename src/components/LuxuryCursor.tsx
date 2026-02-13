import { useEffect, useRef, useState } from "react";

export const LuxuryCursor = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const positionRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
    const hoverCapable = window.matchMedia?.("(hover: hover)").matches ?? false;
    setIsEnabled(finePointer && hoverCapable);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    const root = document.documentElement;
    root.classList.add("luxury-cursor-active");
    const styleId = "force-cursor-none";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        html, body, * , *::before, *::after {
          cursor: none !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    const updateCursor = () => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${positionRef.current.x - 12}px`;
        cursorRef.current.style.top = `${positionRef.current.y - 12}px`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = { x: e.clientX, y: e.clientY };
      setIsVisible(true);
      
      // Use requestAnimationFrame for smooth updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(updateCursor);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    const handleHoverStart = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[data-hover]")
      ) {
        setIsHovering(true);
      }
    };

    const handleHoverEnd = () => setIsHovering(false);

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseover", handleHoverStart);
    document.addEventListener("mouseout", handleHoverEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleHoverStart);
      document.removeEventListener("mouseout", handleHoverEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      root.classList.remove("luxury-cursor-active");
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [isEnabled]);

  if (!isEnabled || !isVisible) return null;

  return (
    <div
      ref={cursorRef}
      className={`luxury-cursor ${isHovering ? "hover" : ""}`}
      style={{
        left: -100,
        top: -100,
      }}
    />
  );
};
