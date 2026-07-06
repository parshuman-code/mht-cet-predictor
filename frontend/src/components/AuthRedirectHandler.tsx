"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthRedirectHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || typeof window === "undefined") return;

    try {
      const pendingRoute = sessionStorage.getItem("clgPredictPendingRoute");
      if (!pendingRoute) return;
      sessionStorage.removeItem("clgPredictPendingRoute");

      if (pendingRoute === "my-list") {
        router.push("/my-list");
      } else if (pendingRoute === "predictor") {
        router.push("/?view=predictor");
      }
    } catch {
      // Ignore storage failures in private browsing modes.
    }
  }, [isLoaded, isSignedIn, router]);

  return null;
}
