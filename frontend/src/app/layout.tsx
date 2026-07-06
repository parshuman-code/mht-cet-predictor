import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { BookmarkProvider } from "@/context/BookmarkContext";
import { AuthRedirectHandler } from "@/components/AuthRedirectHandler";

export const metadata: Metadata = {
  title: "ClgPredict — MHT-CET College Predictor",
  description:
    "Predict your Maharashtra engineering college options instantly using MHT-CET 2026 cutoff data. Filter by category, CAP round, and percentile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full flex flex-col">
          <BookmarkProvider>
            <AuthRedirectHandler />
            {children}
          </BookmarkProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
