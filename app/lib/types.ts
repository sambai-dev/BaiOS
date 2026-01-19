// Shared TypeScript type definitions for the portfolio
// Centralizes interfaces used across multiple components

import { JSX } from "react";

/**
 * Navigation item for navbar and footer links
 */
export interface NavItem {
  name: string;
  link: string;
  icon?: JSX.Element;
}

/**
 * Technology/skill item for the Skills section
 */
export interface TechCard {
  name: string;
  imageUrl: string;
  bgColor: string;
  category: "Frontend" | "Backend & Database" | "Tools";
}

/**
 * Portfolio project for the Projects section
 */
export interface Project {
  id: string;
  heading: string;
  subheading: string;
  valueProp: string;
  highlights: string[];
  role: string;
  imageUrl?: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
}
