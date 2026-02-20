// ContactCTA - Professional call-to-action section for hiring managers
// Uses useScrollAnimation hook for scroll-triggered animations

"use client";

import Link from "next/link";
import { Mail, Linkedin, ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/app/hooks/useScrollAnimation";

export default function ContactCTA() {
  const sectionRef = useScrollAnimation();

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative z-10 py-12 sm:py-16 border-t border-dark-700/50"
    >
      <div className="animate-on-scroll max-w-2xl mx-auto text-center">
        {/* Headline - confident and recruiter-focused */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-200 mb-4">
          Ready to build something great?
        </h2>

        {/* Supporting sentence - concise value prop */}
        <p className="text-base sm:text-lg text-stone-400 mb-8 leading-relaxed">
          I build React/Next.js TypeScript apps end&#x2011;to&#x2011;end and
          I&apos;m looking for frontend or full&#x2011;stack roles in New
          Zealand.
        </p>

        {/* Action buttons - stacked mobile, side-by-side desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Primary CTA - Email */}
          <Link
            href="mailto:sambai.codes@gmail.com"
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-all duration-200"
          >
            <Mail className="w-5 h-5" />
            Email Me
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Secondary CTA - LinkedIn */}
          <Link
            href="https://www.linkedin.com/in/sam-bai-dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg border border-dark-700 text-stone-300 font-medium hover:border-primary/50 hover:text-stone-200 transition-all duration-200 active:scale-95"
          >
            <Linkedin className="w-5 h-5" />
            View LinkedIn
          </Link>
        </div>
      </div>
    </section>
  );
}
