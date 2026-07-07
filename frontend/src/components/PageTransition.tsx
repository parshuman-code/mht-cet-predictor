"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

const pageVariants = {
  initial: { opacity: 0, y: 18, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function PageTransition({ children, className = "", delay = 0 }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ ...pageTransition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const viewVariants = {
  initial: { opacity: 0, scale: 0.98, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.01, filter: "blur(6px)" },
};

const viewTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function ViewTransition({ children, viewKey, className = "" }: { children: ReactNode; viewKey: string; className?: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={viewVariants}
        transition={viewTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Wraps page-level content with a route-based animated transition.
 * Place this inside layout.tsx around {children}.
 */
export function RouteTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
