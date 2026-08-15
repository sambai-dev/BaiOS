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
    name: "Shadcn UI",
    imageUrl: "/imgs/logos/shadcnui.svg",
    bgColor: "bg-white/10",
    category: "Frontend",
  },
  {
    name: "Framer Motion",
    imageUrl: "/imgs/logos/framer.svg",
    bgColor: "bg-black/20",
    category: "Frontend",
  },
  {
    name: "GSAP",
    imageUrl: "/imgs/logos/greensock.svg",
    bgColor: "bg-[#88CE02]/20",
    category: "Frontend",
  },
  {
    name: "Supabase (PostgreSQL + RLS)",
    imageUrl: "/imgs/logos/supabase.svg",
    bgColor: "bg-[#3ECF8E]/20",
    category: "Backend & Database",
  },
  {
    name: "PostgreSQL",
    imageUrl: "/imgs/logos/postgresql.svg",
    bgColor: "bg-[#336791]/20",
    category: "Backend & Database",
  },
  {
    name: "MongoDB Atlas",
    imageUrl: "/imgs/logos/mongodb.svg",
    bgColor: "bg-[#47A248]/20",
    category: "Backend & Database",
  },
  {
    name: "Node.js",
    imageUrl: "/imgs/logos/nodedotjs.svg",
    bgColor: "bg-[#68A063]/20",
    category: "Backend & Database",
  },
  {
    name: "Python",
    imageUrl: "/imgs/logos/python.svg",
    bgColor: "bg-[#3776AB]/20",
    category: "Tools",
  },
  {
    name: "Git/GitHub",
    imageUrl: "/imgs/logos/github.svg",
    bgColor: "bg-white/10",
    category: "Tools",
  },
  {
    name: "Vercel",
    imageUrl: "/imgs/logos/vercel.svg",
    bgColor: "bg-white/10",
    category: "Tools",
  },
  {
    name: "Selenium",
    imageUrl: "/imgs/logos/selenium.svg",
    bgColor: "bg-[#43B02A]/20",
    category: "Tools",
  },
  {
    name: "Playwright",
    imageUrl: "/imgs/logos/playwright.svg",
    bgColor: "bg-[#2B3A42]/20",
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
    highlights: [
      "Customizable Kanban workflows with priority tracking",
      "API rate limiting via Upstash Redis",
      "OAuth sign-in with Better-Auth",
      "Animated landing page with GSAP ScrollTrigger",
    ],
    role: "Full-stack Developer · Personal Project",
    imageUrl: "/imgs/projects/jobtracker.png",
    techStack: [
      "Next.js 16",
      "TypeScript",
      "Tailwind CSS",
      "MongoDB Atlas",
      "Upstash Redis",
      "Better-Auth",
      "shadcn/ui",
      "GSAP",
      "Framer Motion",
    ],
    liveUrl: "https://job-tracker-app-cyan.vercel.app/",
    githubUrl: "https://github.com/sambai-dev/job-tracker-app",
    featured: true,
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
