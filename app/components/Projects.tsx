// Projects Section - Enhanced portfolio display with recruiter-friendly features
// Uses useScrollAnimation hook for scroll-triggered animations

"use client";

import { portfolioProjects } from "@/app/lib/data";
import { useScrollAnimation } from "@/app/hooks/useScrollAnimation";
import ProjectCard from "./ui/ProjectCard";

// Tailwind requires full class names to be statically analyzable
const delayClasses = ["animate-delay-1", "animate-delay-2", "animate-delay-3"];

export default function Projects() {
  const sectionRef = useScrollAnimation();

  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-14 sm:py-20 content-auto"
      id="projects"
    >
      {/* Subtle background gradient for section separation */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-dark-200/30 to-transparent" />

      {/* Section header with scroll animation */}
      <div className="animate-on-scroll space-y-3 mb-6">
        <h2 className="text-3xl min-[430px]:text-4xl font-bold text-stone-200">
          My Portfolio
        </h2>
        <p className="text-sm sm:text-base max-w-lg text-stone-400">
          Production-ready projects showcasing full-stack capabilities.
        </p>
        <p className="text-xs text-stone-500">Last updated: Jan 2026</p>
      </div>

      {/* Projects grid - 2 columns for impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {portfolioProjects.map((project, index) => (
          <div
            key={project.id}
            className={`animate-on-scroll ${delayClasses[index] || ""}`}
          >
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    </section>
  );
}
