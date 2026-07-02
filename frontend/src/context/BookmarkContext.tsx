"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

export type BookmarkItem = {
  id: string;
  college_name: string;
  college_code?: string;
  seat_type: string;
  cap_round: string;
  cutoff_percentile: number;
  [key: string]: any;
};

interface BookmarkContextType {
  bookmarks: BookmarkItem[];
  addBookmark: (item: BookmarkItem) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  reorderBookmarks: (newBookmarks: BookmarkItem[]) => Promise<void>;
  isBookmarked: (choiceCode: string, seatType: string, capRound: string) => boolean;
  loading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const backendUrlRef = useRef<string>("https://mht-cet-predictor-f8dl.onrender.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        backendUrlRef.current = "http://localhost:8001";
      }
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      fetchBookmarks();
    } else {
      setBookmarks([]);
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, userId]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrlRef.current}/bookmarks/${userId}`);
      const data = await res.json();
      if (data.status === "success") {
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error("Failed to fetch bookmarks", error);
    } finally {
      setLoading(false);
    }
  };

  const addBookmark = async (item: BookmarkItem) => {
    if (!userId) return;
    try {
      // Optimistic update
      setBookmarks((prev) => [...prev, item]);
      
      const res = await fetch(`${backendUrlRef.current}/bookmarks/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, bookmark: item }),
      });

      // Handle non-JSON responses (e.g., 404 HTML from sleeping Render backend)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Backend is sleeping or returned HTML error page
        console.error("Bookmark API returned non-JSON:", res.status, res.statusText);
        // Keep the optimistic update — don't revert, just silently fail so UX is smooth
        return;
      }

      const data = await res.json();
      if (data.status !== "success") {
        // Revert optimistic update only on real duplicate/business errors
        setBookmarks((prev) => prev.filter((b) => b.id !== item.id));
        const errMsg = data.message
          || (Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail)
          || "Failed to add bookmark";
        alert(errMsg);
      }
    } catch (error) {
      // Network error or JSON parse error — keep optimistic update silently
      console.error("Bookmark network error:", error);
    }
  };

  const removeBookmark = async (id: string) => {
    if (!userId) return;
    try {
      const original = [...bookmarks];
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      
      const res = await fetch(`${backendUrlRef.current}/bookmarks/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, bookmark_id: id }),
      });
      const data = await res.json();
      if (data.status !== "success") {
        setBookmarks(original);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const reorderBookmarks = async (newBookmarks: BookmarkItem[]) => {
    if (!userId) return;
    try {
      setBookmarks(newBookmarks);
      
      await fetch(`${backendUrlRef.current}/bookmarks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, bookmarks: newBookmarks }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const isBookmarked = (choiceCode: string, seatType: string, capRound: string) => {
    return bookmarks.some(b => b.choice_code === choiceCode && b.seat_type === seatType && b.cap_round === capRound);
  };

  return (
    <BookmarkContext.Provider value={{ bookmarks, addBookmark, removeBookmark, reorderBookmarks, isBookmarked, loading }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
};
