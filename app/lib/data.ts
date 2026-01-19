// Portfolio data - projects and tech stack
// Update these values with your own information

import type { TechCard, Project } from "./types";

// Technology/Skills cards - organized by category
export const techCardsItems: TechCard[] = [
  {
    name: "React",
    imageUrl: "/imgs/logos/react.svg",
    bgColor: "bg-[#61DAFB]/20",
    category: "Frontend",
  },
  {
    name: "Next.js",
    imageUrl: "/imgs/logos/nextdotjs.svg",
    bgColor: "bg-white/10",
    category: "Frontend",
  },
  {
    name: "TypeScript",
    imageUrl: "/imgs/logos/typescript.svg",
    bgColor: "bg-[#3178C6]/20",
    category: "Frontend",
  },
  {
    name: "Tailwind CSS",
    imageUrl: "/imgs/logos/tailwindcss.svg",
    bgColor: "bg-[#06B6D4]/20",
    category: "Frontend",
  },
  {
    name: "Node.js",
    imageUrl: "/imgs/logos/nodedotjs.svg",
    bgColor: "bg-[#68A063]/20",
    category: "Backend & Database",
  },
  {
    name: "PostgreSQL",
    imageUrl: "/imgs/logos/postgresql.svg",
    bgColor: "bg-[#336791]/20",
    category: "Backend & Database",
  },
  {
    name: "Supabase",
    imageUrl: "/imgs/logos/supabase.svg",
    bgColor: "bg-[#3ECF8E]/20",
    category: "Backend & Database",
  },
  {
    name: "Git",
    imageUrl: "/imgs/logos/git.svg",
    bgColor: "bg-[#F05032]/20",
    category: "Tools",
  },
];

// Portfolio projects - displayed in the Projects section
export const portfolioProjects: Project[] = [
  {
    id: "project-4",
    heading: "Job Tracker",
    subheading: "Full-Stack Job Application OS",
    valueProp:
      "Track applications, manage interviews, and analyze what works — a Kanban-style job search OS.",
    highlights: [],
    role: "Full-stack Developer · Personal Project",
    imageUrl: "/imgs/projects/jobtracker.png",
    techStack: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "MongoDB",
      "Mongoose",
      "shadcn/ui",
      "GSAP",
      "Framer Motion",
    ],
    liveUrl: "https://job-tracker-app-cyan.vercel.app/",
    githubUrl: "https://github.com/sambai-dev/job-tracker-app",
    featured: true,
  },
  {
    id: "project-1",
    heading: "TaskFlow",
    subheading: "SaaS Task Management Platform",
    valueProp:
      "A production-ready Kanban board that helps teams organize work with real-time collaboration.",
    highlights: [],
    role: "Sole full-stack developer",
    imageUrl: "/imgs/projects/taskflow.png",
    techStack: ["Next.js", "TypeScript", "Supabase", "Clerk", "PostgreSQL"],
    liveUrl: "https://taskboard-nextjs.vercel.app/",
    githubUrl: "https://github.com/sambai-dev/taskflow-board",
    featured: false,
  },
  {
    id: "project-2",
    heading: "Waka Eastern Bay",
    subheading: "Internal Booking System",
    valueProp:
      "A complete booking system for a NZ non-profit, replacing manual coordination with automated scheduling.",
    highlights: [],
    role: "Full-stack Developer · Client Project",
    imageUrl: "/imgs/projects/wakawebsite.png",
    techStack: ["React", "Node.js", "Express", "MongoDB", "Nodemailer"],
    featured: false,
  },
  {
    id: "project-3",
    heading: "Personal Portfolio",
    subheading: "Designer & Developer",
    valueProp:
      "A performance-optimized Next.js portfolio featuring Framer Motion animations and responsive design.",
    highlights: [],
    role: "Designer & developer",
    imageUrl: "/imgs/projects/portfolio.png",
    techStack: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "Lenis",
    ],
    githubUrl: "https://github.com/sambai-dev/portfolio-under-construction",
    featured: false,
  },
];
