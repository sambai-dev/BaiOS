// Footer - Minimal personal footer for developer portfolio
// Usage: Import in app/page.tsx or app/layout.tsx
// Place at the bottom of your main content

import Link from "next/link";
import { Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 py-12 sm:py-14 border-t border-dark-700">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Line 1: Name · Role · Location */}
        <p className="text-sm sm:text-base text-stone-300">
          Sam Bai
          <span className="text-stone-600 mx-2">·</span>
          Full-Stack Developer
          <span className="text-stone-600 mx-2">·</span>
          Hamilton, New Zealand
        </p>

        {/* Line 2: Availability + Email */}
        <p className="text-sm text-stone-400">
          Open to frontend & full-stack roles in New Zealand
          <span className="text-stone-600 mx-2">·</span>
          <Link
            href="mailto:sambai.codes@gmail.com"
            className="text-primary hover:underline underline-offset-2"
          >
            sambai.codes@gmail.com
          </Link>
        </p>

        {/* Line 3: Social icons */}
        <div className="flex items-center gap-5 pt-2">
          <Link
            href="https://github.com/sambai-dev"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-stone-500 hover:text-stone-200 transition-colors"
          >
            <Github className="w-5 h-5" />
          </Link>
          <Link
            href="https://www.linkedin.com/in/sam-bai-dev/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-stone-500 hover:text-stone-200 transition-colors"
          >
            <Linkedin className="w-5 h-5" />
          </Link>
        </div>

        {/* Tiny copyright */}
        <p className="text-xs text-stone-600 pt-4">
          © {new Date().getFullYear()} Sam Bai
        </p>
      </div>
    </footer>
  );
}
