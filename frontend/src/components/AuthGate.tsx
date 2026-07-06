"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { GraduationCap, Loader2 } from "lucide-react";
import { ReactNode } from "react";

type AuthGateProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  onSignInClick?: () => void;
};

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
      <p className="text-sm font-semibold text-slate-600">Loading your session...</p>
    </div>
  );
}

export function AuthGate({
  children,
  title = "Sign in to continue",
  description = "Create a free account or sign in to access your college predictor and saved list.",
  onSignInClick,
}: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingScreen />;
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-xl shadow-slate-900/10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{description}</p>
          <SignInButton mode="modal">
            <button
              type="button"
              onClick={onSignInClick}
              className="mt-8 w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800"
            >
              Sign In / Sign Up
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
