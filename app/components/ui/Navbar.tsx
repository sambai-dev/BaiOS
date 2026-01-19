"use client";

// Navbar - Floating pill navigation (Performance Optimized)
// Features:
// - Floating centered pill design
// - Hides when scrolling down, shows when scrolling up
// - OPTIMIZED: Only updates state when visibility actually changes
// - Shows icons on mobile, text on desktop

import { cn } from "@/app/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { House, BriefcaseBusiness, UserRound, Contact } from "lucide-react";
import type { NavItem } from "@/app/lib/types";
import { useLenis } from "lenis/react";

// Navigation items with proper typing
const navItems: NavItem[] = [
  { name: "Home", link: "#home", icon: <House /> },
  { name: "Projects", link: "#projects", icon: <BriefcaseBusiness /> },
  { name: "About", link: "#about", icon: <UserRound /> },
  { name: "Contact", link: "#contact", icon: <Contact /> },
];

interface NavbarProps {
  className?: string;
}

export const Navbar = ({ className }: NavbarProps) => {
  // State to control navbar visibility
  const [visible, setVisible] = useState(true);
  
  const lenis = useLenis();

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    link: string
  ) => {
    if (link.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(link);
      if (lenis) {
        lenis.scrollTo(link, { offset: 0 });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Refs to track scroll position without causing re-renders
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      // Use requestAnimationFrame to throttle scroll handling
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Near top of page - always show
          if (currentScrollY < 50) {
            setVisible(true);
          } else {
            // Only update if direction changed AND scrolled enough (hysteresis)
            const diff = Math.abs(currentScrollY - lastScrollY.current);
            if (diff > 10) { // Minimum scroll delta of 10px to prevent flashing
              const isScrollingDown = currentScrollY > lastScrollY.current;
              setVisible(!isScrollingDown);
            }
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    // AnimatePresence enables exit animations when component unmounts
    <AnimatePresence mode="wait">
      <motion.nav
        // Initial state: navbar starts above viewport (hidden)
        initial={{
          opacity: 1,
          y: -100,
        }}
        // Animate to: slide down when visible, slide up when hidden
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        // Smooth 200ms transition
        transition={{
          duration: 0.2,
        }}
        // Styling classes for the floating pill navbar
        className={cn(
          // Layout: centered, auto-width based on content
          "flex max-w-fit fixed top-4 sm:top-10 inset-x-0 mx-auto",
          // Appearance: dark background with subtle border
          // PERF FIX: Removed backdrop-blur-sm, using opaque bg to avoid scroll compositing
          "border border-dark-700 rounded-full sm:rounded-lg bg-dark-200",
          // Shadow for depth effect
          "shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]",
          // High z-index to stay above all content
          "z-[5000]",
          // Responsive padding and spacing
          "px-4 sm:px-8 py-3 sm:py-4 items-center justify-center gap-3 sm:gap-4",
          className
        )}
        aria-label="Primary"
      >
        {/* Render each navigation item */}
        {navItems.map((navItem) => (
          <Link
            key={navItem.link}
            href={navItem.link}
            onClick={(e) => handleNavClick(e, navItem.link)}
            className={cn(
              // Base styling: light text with flex layout
              "relative text-neutral-50 items-center flex group",
              // Hover effect: changes to primary color
              "hover:text-primary transition-colors duration-200",
              // Focus state for accessibility
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            )}
            aria-label={navItem.name}
          >
            {/* Mobile: show only icon */}
            <span className="block sm:hidden">{navItem.icon}</span>
            {/* Desktop: show text label */}
            <span className="hidden sm:block text-sm font-medium relative">
              {navItem.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </span>
          </Link>
        ))}
      </motion.nav>
    </AnimatePresence>
  );
};
