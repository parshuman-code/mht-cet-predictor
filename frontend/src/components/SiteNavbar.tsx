"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignInButton, UserButton, useAuth, useClerk } from "@clerk/nextjs";
import { Bookmark, GraduationCap, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useBookmarks } from "@/context/BookmarkContext";

type SiteNavbarProps = {
  variant?: "home" | "subpage";
  viewMode?: "landing" | "predictor";
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
  onOpenPredictor?: () => void;
  onGoHome?: () => void;
  onGoMyList?: () => void;
};

const LANDING_SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "purpose", label: "Purpose" },
  { id: "howToUse", label: "How" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

export function SiteNavbar({
  variant = "home",
  viewMode = "landing",
  activeSection = "hero",
  onNavigateSection,
  onOpenPredictor,
  onGoHome,
  onGoMyList,
}: SiteNavbarProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const { bookmarks } = useBookmarks();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goToMyList = () => {
    if (!isSignedIn) {
      try {
        sessionStorage.setItem("clgPredictPendingRoute", "my-list");
      } catch {
        // Ignore storage failures in private browsing modes.
      }
      openSignIn();
      return;
    }
    if (onGoMyList) {
      onGoMyList();
      return;
    }
    router.push("/my-list");
  };

  const goToPredictor = () => {
    if (!isSignedIn) {
      try {
        sessionStorage.setItem("clgPredictPendingRoute", "predictor");
      } catch {
        // Ignore storage failures in private browsing modes.
      }
      openSignIn();
      return;
    }
    if (onOpenPredictor) {
      onOpenPredictor();
      return;
    }
    router.push("/predictor");
  };

  const goHome = () => {
    if (onGoHome) {
      onGoHome();
      return;
    }
    router.push("/");
  };

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-transparent backdrop-blur-md border-b border-white/20 shadow-sm px-6 py-4 transition-all duration-300">
        <button
          type="button"
          onClick={goHome}
          className="flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 shadow-md shadow-slate-500/10">
            <GraduationCap className="h-5 w-5 text-slate-900" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            Clg<span className="font-[family-name:var(--font-caveat)] text-2xl text-slate-700">Predict</span>
          </span>
        </button>

        {variant === "home" ? (
          <div className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white/60 p-1 shadow-sm backdrop-blur-sm md:flex">
            {LANDING_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigateSection?.(section.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  viewMode === "landing" && activeSection === section.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/60 p-1 shadow-sm backdrop-blur-sm md:flex">
            <button
              type="button"
              onClick={goHome}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out ${
                pathname === "/" ? "bg-slate-900 text-white shadow-md scale-[1.02]" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={goToPredictor}
              className="rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 transition-all duration-300 ease-out hover:text-slate-900 hover:bg-slate-100/60"
            >
              Predictor
            </button>
            <Link
              href="/my-list"
              prefetch={true}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ease-out ${
                pathname === "/my-list" ? "bg-slate-900 text-white shadow-md scale-[1.02]" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              My List
            </Link>
          </div>
        )}

        <div className="flex min-w-[108px] items-center justify-end gap-3">
          {!mounted || !isLoaded ? (
            <div className="h-9 w-9 rounded-full bg-slate-200/80" aria-hidden="true" />
          ) : isSignedIn ? (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={goToMyList}
                className="hidden items-center gap-2 text-sm font-bold text-slate-900 transition-colors hover:text-slate-700 md:flex"
              >
                <Bookmark className="h-4 w-4" />
                My List
                {bookmarks.length > 0 && (
                  <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                    {bookmarks.length}
                  </span>
                )}
              </button>
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 ring-2 ring-slate-300/80" } }} />
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-700 hover:text-slate-900 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800"
                >
                  Sign In
                </button>
              </SignInButton>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-700 hover:text-slate-900 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg shadow-sm"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Full-page blur overlay — sits OUTSIDE the nav so it covers the entire page */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Slide-in drawer panel */}
      <div
        className={`fixed inset-y-0 right-0 z-[70] w-72 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <span className="text-sm font-black uppercase tracking-widest text-slate-500">Menu</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <div className="flex flex-col gap-1 p-4">
          {variant === "home" ? (
            LANDING_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  onNavigateSection?.(section.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${
                  viewMode === "landing" && activeSection === section.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {section.label}
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={() => { goHome(); setIsMobileMenuOpen(false); }}
                className={`text-left text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => { goToPredictor(); setIsMobileMenuOpen(false); }}
                className="text-left text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Predictor
              </button>
              <Link
                href="/my-list"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-left text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${
                  pathname === "/my-list" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                My List
              </Link>
            </>
          )}

          {isSignedIn && (
            <button
              type="button"
              onClick={() => { goToMyList(); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 text-sm font-bold text-slate-900 px-4 py-3 mt-2 rounded-xl border-t border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <Bookmark className="h-4 w-4" />
              My List
              {bookmarks.length > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                  {bookmarks.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
