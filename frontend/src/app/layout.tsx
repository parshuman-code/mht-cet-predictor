import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ClientLayout } from "@/components/ClientLayout";

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
      <html lang="en" className="h-screen w-screen overflow-hidden antialiased">
        <body className="h-screen w-screen flex flex-col overflow-hidden">
          <ClientLayout>
            {children}
          </ClientLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
