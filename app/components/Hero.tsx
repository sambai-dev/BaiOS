"use client";

// Features:
// - Location badge at top ("Based in New Zealand")
// - Large animated heading with highlighted text (WordReveal)
// - Subtitle description
// - CTA buttons (See My Work + Download CV)
// - Grid background pattern
// - Fully mobile responsive

import { motion, useReducedMotion } from "framer-motion";
import { MapPin, ChevronRight, Download } from "lucide-react";
import WordReveal from "./WordReveal";
import { useLenis } from "lenis/react";
import { useRef } from "react";

export default function Hero() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useLenis(({ scroll }) => {
    if (prefersReducedMotion) {
      return;
    }
    if (heroRef.current) {
      heroRef.current.style.transform = `translateY(${scroll * 0.5}px)`;
      // Fade out hero text as you scroll
      heroRef.current.style.opacity = Math.max(0, 1.5 - scroll / 400).toString();
    }
    if (badgeRef.current) {
      // Reduced speed to prevent overlap (was 1.2)
      badgeRef.current.style.transform = `translateY(${scroll * 0.4}px)`;
      // Faster fade out for the badge so it clears the way
      badgeRef.current.style.opacity = Math.max(0, 1 - scroll / 300).toString();
    }
  });

  return (
    <section
      id="home"
      className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-16 sm:pt-20 pb-28 sm:pb-36 px-4"
    >
      {/* Grid background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 w-full h-full bg-grid grid-mask" />
      </div>

      {/* Location Badge - Small accent above main heading */}
      <div ref={badgeRef} className="will-change-transform">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 text-xs sm:text-sm text-stone-400 mb-3"
        >
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-stone-500" />
          <span>Based in Hamilton, New Zealand</span>
          <span className="text-stone-600">•</span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 animate-pulse">Open for Work</span>
        </motion.div>
      </div>

      {/* Main Heading - Word reveal animation */}
      <div ref={heroRef} className="will-change-transform">
        <WordReveal
          words="Building Modern & Scalable Web Solutions"
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center max-w-3xl leading-tight px-2"
        />
      </div>

      {/* Value Statement - Short one-liner */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-3 sm:mt-4 text-sm sm:text-base text-stone-400 text-center px-2"
      >
        <span className="text-primary font-medium">Sam Bai</span> · Full-Stack Developer · Crafting clean, user-friendly experiences
      </motion.p>

      {/* CTA Buttons - Stack on mobile, side by side on larger screens */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center gap-3"
      >
        {/* See My Work button - with katana shine effect on hover */}
        <a
          href="#projects"
          aria-label="See my portfolio projects"
          className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-dark-200 border border-dark-700 text-stone-200 text-sm font-medium hover:border-stone-400 hover:bg-dark-300 transition-all duration-300 overflow-hidden"
        >
          {/* Katana shine overlay - triggers on hover */}
          <span className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-[left] duration-700 ease-in-out z-10 pointer-events-none" />
          See My Work
          <ChevronRight className="w-4 h-4" />
        </a>

        {/* Download CV - text link style with icon */}
        <a
          href="/resume/SamBai_Resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download my CV (PDF)"
          className="flex items-center gap-2 text-stone-300 hover:text-primary transition-all duration-300 active:scale-95"
        >
          <Download className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm sm:text-base">Download CV</span>
        </a>
      </motion.div>
    </section>
  );
}
