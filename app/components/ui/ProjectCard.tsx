// ProjectCard - Portfolio project card with balanced sizing
// Now a Server Component for better performance (no client JS needed)

import { cn } from "@/app/lib/utils";
import { ExternalLink, Github, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/app/lib/types";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const {
    heading,
    subheading,
    valueProp,
    role,
    imageUrl,
    techStack,
    liveUrl,
    githubUrl,
    featured,
  } = project;

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden h-full flex flex-col",
        "bg-dark-200 border border-dark-700",
        "hover:border-stone-500 transition-all duration-300",
        // Featured card gets subtle glow and spans full width
        featured &&
          "ring-1 ring-primary/20 shadow-lg shadow-primary/5"
      )}
    >
      {/* Featured badge - PERF FIX: Removed backdrop-blur-sm, using solid bg */}
      {featured && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-white text-xs font-medium">
          <Star className="w-3 h-3 fill-current" />
          Featured
        </div>
      )}

      {/* Project image */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={heading}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={featured}
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-300 to-dark-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-200 via-dark-200/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Subheading */}
        <p className="text-xs text-primary font-medium mb-1">{subheading}</p>

        {/* Title */}
        <h3 className="text-xl font-bold text-stone-200 mb-2">{heading}</h3>

        {/* Value prop */}
        <p className="text-sm text-stone-400 mb-3 leading-relaxed">
          {valueProp}
        </p>


        {/* Role */}
        <p className="text-xs text-stone-500 mb-3">{role}</p>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 text-xs rounded-full bg-dark-300 text-stone-400 border border-dark-700"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-4 pt-3 border-t border-dark-700 mt-auto">
          {liveUrl && (
            <Link
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95",
                featured
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-dark-300 text-stone-200 hover:bg-dark-400"
              )}
            >
              <ExternalLink className="w-4 h-4" />
              Live Demo
            </Link>
          )}
          {githubUrl && (
            <Link
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-dark-300 text-stone-200 hover:bg-dark-400 transition-all duration-200 active:scale-95"
            >
              <Github className="w-4 h-4" />
              Code
            </Link>
          )}
          {!liveUrl && !githubUrl && (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-dark-300 text-stone-400">
              Internal codebase
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
