"use client";

import { useEffect, useRef } from "react";

/**
 * Custom hook for scroll-triggered CSS animations.
 * Observes each `.animate-on-scroll` child element directly and adds
 * `in-view` class when that specific element enters the viewport.
 *
 * @returns A ref to attach to the container element
 *
 * @example
 * ```tsx
 * function MySection() {
 *   const sectionRef = useScrollAnimation();
 *   return (
 *     <section ref={sectionRef}>
 *       <h2 className="animate-on-scroll">Title</h2>
 *       <p className="animate-on-scroll animate-delay-1">Text</p>
 *     </section>
 *   );
 * }
 * ```
 */
export function useScrollAnimation<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Find all animatable children once on mount
    const animatableElements = container.querySelectorAll(".animate-on-scroll");
    if (animatableElements.length === 0) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      animatableElements.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            // Stop observing once animated
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "-50px" }
    );

    // Observe each child element directly
    animatableElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}
