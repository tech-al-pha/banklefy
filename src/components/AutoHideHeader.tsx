import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AutoHideHeaderProps<T extends ElementType = "nav"> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

const HIDE_DELAY_MS = 5000;

export default function AutoHideHeader<T extends ElementType = "nav">({
  as,
  className,
  children,
  ...restProps
}: AutoHideHeaderProps<T>) {
  const Tag = (as ?? "nav") as ElementType;
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const hoverHideTimerRef = useRef<number | null>(null);
  const hoveringRef = useRef(false);

  const clearHideTimer = () => {
    if (hoverHideTimerRef.current !== null) {
      window.clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  };

  const showHeader = () => {
    clearHideTimer();
    setIsVisible(true);
  };

  const scheduleHide = () => {
    clearHideTimer();
    if (window.scrollY <= 40 || hoveringRef.current) return;
    hoverHideTimerRef.current = window.setTimeout(() => {
      if (!hoveringRef.current && window.scrollY > 40) {
        setIsVisible(false);
      }
    }, HIDE_DELAY_MS);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (currentY <= 40) {
        showHeader();
        lastScrollYRef.current = currentY;
        return;
      }

      if (delta > 10) {
        clearHideTimer();
        setIsVisible(false);
      } else if (delta < -10) {
        showHeader();
        scheduleHide();
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      clearHideTimer();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <div
        className="fixed left-0 right-0 top-0 z-[55] h-5"
        onMouseEnter={() => {
          hoveringRef.current = true;
          showHeader();
        }}
        onMouseLeave={() => {
          hoveringRef.current = false;
          scheduleHide();
        }}
      />
      <Tag
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isVisible ? "translate-y-0" : "-translate-y-[115%]",
          className,
        )}
        {...restProps}
        onMouseEnter={() => {
          hoveringRef.current = true;
          showHeader();
        }}
        onMouseLeave={() => {
          hoveringRef.current = false;
          scheduleHide();
        }}
      >
        {children}
      </Tag>
    </>
  );
}
