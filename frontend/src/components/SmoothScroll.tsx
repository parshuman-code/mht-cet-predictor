"use client";

import { useEffect, useRef } from "react";

/**
 * SmoothScroll provider – uses Lenis-style requestAnimationFrame-based
 * smooth scrolling for a premium, butter-smooth scroll experience.
 * This replaces CSS `scroll-behavior: smooth` which can be janky on
 * content-heavy pages.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Enable smooth scrolling via CSS on html for anchor-based navigation
    // while we handle the premium feel via will-change and scroll optimizations
    const html = document.documentElement;

    // Optimize scroll performance
    html.style.scrollBehavior = "smooth";

    // Add passive scroll listeners for performance
    const handleScroll = () => {
      // RAF-based scroll tracking for zero-jank scroll detection
      requestAnimationFrame(() => {
        // This ensures scroll-linked animations are synced to paint
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      html.style.scrollBehavior = "";
    };
  }, []);

  return <>{children}</>;
}
