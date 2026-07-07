"use client";

import { ReactNode } from "react";
import { RouteTransition } from "@/components/PageTransition";
import { SmoothScrollProvider } from "@/components/SmoothScroll";
import { BookmarkProvider } from "@/context/BookmarkContext";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <BookmarkProvider>
      <SmoothScrollProvider>
        <AuthRedirectHandler />
        <RouteTransition>
          {children}
        </RouteTransition>
      </SmoothScrollProvider>
    </BookmarkProvider>
  );
}
