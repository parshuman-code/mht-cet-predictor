"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { UserButton, SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { useBookmarks, BookmarkItem } from "@/context/BookmarkContext";
import {
  Search, SlidersHorizontal, GraduationCap, MapPin, Award, ChevronLeft, ChevronRight,
  ArrowDownNarrowWide, Mail, Phone, Info, Cpu, Database, Sparkles, Layers,
  ListOrdered, CheckCircle2, ArrowRight, PanelLeftClose, PanelLeft, Bookmark, BookmarkCheck, List
} from "lucide-react";
import { ArrowUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBackendBaseUrl } from "@/lib/api";
 
interface PredictionItem {
  college_code: string; college_name: string; choice_code: string; branch_name: string;
  status: string; home_university: string; quota_allocation: string; seat_type: string;
  stage: string; cutoff_rank: number; cutoff_percentile: number; cap_round: string;
}

type PredictorState = Partial<{
  percentile: string;
  category: string;
  gender: string;
  capRound: string;
  minPercentile: string;
  branchSearch: string;
  lastSearchedQuery: string;
  selectedCity: string;
  pageInput: string;
  results: PredictionItem[];
  currentPage: number;
  totalCount: number;
  hasPredicted: boolean;
  viewMode: "landing" | "predictor";
  rightPanelScroll: number;
}>;
 
export default function Home() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"landing" | "predictor">("landing");
  const [activeSection, setActiveSection] = useState<string>("hero");
  
  // Access Control: Block if explicitly set to false
  const isAllowed = user?.publicMetadata?.isAllowed !== false;
 
  // Sidebar Hover/Toggle States
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
 
  // Predictor parameters
  const [percentile, setPercentile] = useState<string>("");
  const [category, setCategory] = useState<string>("OPEN");
  const [gender, setGender] = useState<string>("Male");
  const [capRound, setCapRound] = useState<string>("Round 1");
  const [minPercentile, setMinPercentile] = useState<string>("0");
  const [branchSearch, setBranchSearch] = useState<string>("");
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>("");
  const [recentCollegeSearches, setRecentCollegeSearches] = useState<string[]>([]);
  const [recentBranchSearches, setRecentBranchSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const [pageInput, setPageInput] = useState<string>("1");
  
  // API Results Control
  const [results, setResults] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasPredicted, setHasPredicted] = useState<boolean>(false);
  const itemsPerPage = 20;

  // cityOptions will be loaded from backend so names exactly match CSV/db
  const [cityOptions, setCityOptions] = useState<string[]>(["All Cities"]);

  // Load city names from backend on mount (preserve exact names from CSV)
  const [citiesLoading, setCitiesLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadCities = async () => {
      try {
        setCitiesLoading(true);
        const baseUrl = getBackendBaseUrl();
        const res = await fetch(`${baseUrl}/cities`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.cities)) {
          setCityOptions(["All Cities", ...json.cities]);
        }
      } catch (e) {
        // ignore errors; keep default
      }
      finally { setCitiesLoading(false); }
    };
    loadCities();
  }, []);

  // Retry loader for cities (exposed to UI)
  const reloadCities = async () => {
    try {
      setCitiesLoading(true);
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/cities`);
      if (!res.ok) throw new Error('bad');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.cities)) {
        setCityOptions(["All Cities", ...json.cities]);
      }
    } catch (e) {
      // no-op
    } finally { setCitiesLoading(false); }
  };
 
  const heroRef = useRef<HTMLDivElement>(null);
  const purposeRef = useRef<HTMLDivElement>(null);
  const howToUseRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (viewMode !== "landing") return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 });
 
    const refs = [heroRef, purposeRef, howToUseRef, aboutRef, contactRef];
    refs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, [viewMode]);
 
  useEffect(() => {
    if (viewMode !== "landing") return;
    const elementObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-12");
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
 
    document.querySelectorAll(".scroll-pop").forEach((el) => elementObserver.observe(el));
    return () => elementObserver.disconnect();
  }, [viewMode]);

  const fetchPredictions = React.useCallback(async (
    pageNumber: number, 
    searchQuery: string,
    overridePercentile?: string,
    overrideCategory?: string,
    overrideGender?: string,
    overrideCapRound?: string,
    overrideMinPercentile?: string,
    overrideCity?: string
  ) => {
    setLoading(true);
    
    if (searchQuery.trim() !== "") {
      const isPerc = overridePercentile !== undefined ? overridePercentile : percentile;
      if (!isPerc) {
        setRecentCollegeSearches(prev => [searchQuery.trim(), ...prev.filter(s => s !== searchQuery.trim())].slice(0, 8));
      } else {
        setRecentBranchSearches(prev => [searchQuery.trim(), ...prev.filter(s => s !== searchQuery.trim())].slice(0, 8));
      }
    }

    try {
      const pVal = overridePercentile !== undefined ? overridePercentile : percentile;
      const cVal = overrideCategory !== undefined ? overrideCategory : category;
      const gVal = overrideGender !== undefined ? overrideGender : gender;
      const rVal = overrideCapRound !== undefined ? overrideCapRound : capRound;
      const mVal = overrideMinPercentile !== undefined ? overrideMinPercentile : minPercentile;
      const cityVal = overrideCity !== undefined ? overrideCity : selectedCity;

      const percValue = pVal ? parseFloat(pVal) : -1;
      const baseUrl = getBackendBaseUrl();
      let apiUrl = `${baseUrl}/predict?percentile=${encodeURIComponent(percValue)}&category=${encodeURIComponent(cVal)}&gender=${encodeURIComponent(gVal)}&cap_round=${encodeURIComponent(rVal)}&min_percentile=${encodeURIComponent(mVal)}&page=${pageNumber}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`;
      if (cityVal && cityVal !== "All Cities") {
        apiUrl += `&city=${encodeURIComponent(cityVal)}`;
      }

      const response = await fetch(apiUrl, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
      const data = await response.json();
      if (data.status === "success") {
        setResults(data.predictions);
        setTotalCount(data.total_count);
        setCurrentPage(pageNumber);
        setPageInput(String(pageNumber));
        setHasPredicted(true);
        setBranchSearch(""); // Auto-clear search box after results load
        if (rightPanelRef.current) rightPanelRef.current.scrollTo({ top: 0, behavior: "instant" });
      }
    } catch (error: unknown) {
      alert(`Connection Error: ${error instanceof Error ? error.message : "Unknown error occured"}`);
    } finally {
      setLoading(false);
    }
  }, [percentile, category, gender, capRound, minPercentile, selectedCity]);

  // Persist predictor state into the current history entry so back-navigation
  // can restore filters/results. We keep a ref with the latest values to avoid
  // stale-closure issues when writing to history.
  const predictorStateRef = React.useRef<PredictorState | null>(null);
  const hasHydratedViewRef = React.useRef(false);

  const readSavedPredictorState = React.useCallback((): PredictorState | undefined => {
    if (typeof window === "undefined") return undefined;
    let state = window.history.state?.predictorState as PredictorState | undefined;
    if (!state) {
      try {
        const storedState = sessionStorage.getItem("predictorState");
        if (storedState) state = JSON.parse(storedState) as PredictorState;
      } catch {
        // Ignore malformed or unavailable storage.
      }
    }
    return state;
  }, []);

  const restorePredictorState = React.useCallback((state?: PredictorState) => {
    if (!state) return false;

    if (state.percentile !== undefined) setPercentile(state.percentile);
    if (state.category !== undefined) setCategory(state.category);
    if (state.gender !== undefined) setGender(state.gender);
    if (state.capRound !== undefined) setCapRound(state.capRound);
    if (state.minPercentile !== undefined) setMinPercentile(state.minPercentile);
    if (state.branchSearch !== undefined) setBranchSearch(state.branchSearch);
    if (state.lastSearchedQuery !== undefined) setLastSearchedQuery(state.lastSearchedQuery);
    if (state.selectedCity !== undefined) setSelectedCity(state.selectedCity);
    if (state.pageInput !== undefined) setPageInput(state.pageInput);
    if (state.results) setResults(state.results);
    if (state.currentPage) setCurrentPage(state.currentPage);
    if (state.totalCount !== undefined) setTotalCount(state.totalCount);
    if (state.hasPredicted !== undefined) setHasPredicted(state.hasPredicted);
    setTimeout(() => {
      if (rightPanelRef.current && state.rightPanelScroll !== undefined) {
        rightPanelRef.current.scrollTop = state.rightPanelScroll;
      }
    }, 0);
    return true;
  }, []);

  React.useEffect(() => {
    const nextState: PredictorState = {
      percentile,
      category,
      gender,
      capRound,
      minPercentile,
      branchSearch,
      lastSearchedQuery,
      selectedCity,
      pageInput,
      results,
      currentPage,
      totalCount,
      hasPredicted,
      viewMode,
      // preserve scroll position of right panel if available
      rightPanelScroll: typeof window !== 'undefined' && rightPanelRef.current ? rightPanelRef.current.scrollTop : 0,
    };
    predictorStateRef.current = nextState;
    if (!hasHydratedViewRef.current) return;
    try {
      if (typeof window !== "undefined") {
        const savedState = viewMode === "predictor" ? nextState : window.history.state?.predictorState;
        window.history.replaceState({ ...(window.history.state || {}), predictorState: savedState }, "");
        try { sessionStorage.setItem("clgPredictViewMode", viewMode); } catch { /* ignore */ }
        if (viewMode === "predictor") {
          try { sessionStorage.setItem('predictorState', JSON.stringify(nextState)); } catch { /* ignore */ }
        }
      }
    } catch {
      // ignore replaceState failures in older browsers
    }
  }, [percentile, category, gender, capRound, minPercentile, branchSearch, lastSearchedQuery, selectedCity, pageInput, results, currentPage, totalCount, hasPredicted, viewMode]);

  // On first mount, restore predictor state if available in history.state
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const savedViewMode = (() => {
      try { return sessionStorage.getItem("clgPredictViewMode"); } catch { return null; }
    })();
    const shouldOpenPredictor = params.get("view") === "predictor" || savedViewMode === "predictor";
    const savedState = readSavedPredictorState();

    const restored = restorePredictorState(savedState);
    if (shouldOpenPredictor) {
      if (params.get("view") === "predictor") {
        window.history.replaceState({ ...(window.history.state || {}), predictorState: savedState ?? predictorStateRef.current }, "", window.location.pathname);
      }
      setViewMode("predictor");
      if (!restored) setHasPredicted(false);
    }

    hasHydratedViewRef.current = true;
  }, [readSavedPredictorState, restorePredictorState]);

  // Reset Predict page state when navigating away
  useEffect(() => {
    if (viewMode === "predictor" && !hasPredicted) {
      // Use setTimeout to avoid synchronous setState calls during render cycle
      const timer = setTimeout(() => {
        fetchPredictions(1, "", "-1", "OPEN", "Male", "All Rounds", "0", "All Cities");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [viewMode, fetchPredictions, hasPredicted]);
 
  const handleNavigateHome = (sectionId: string) => {
    setViewMode("landing");
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({ ...(window.history.state || {}), predictorState: predictorStateRef.current }, "", window.location.pathname);
    }
    try { sessionStorage.setItem("clgPredictViewMode", "landing"); } catch { /* ignore */ }
    setPercentile("");
    setBranchSearch("");
    setLastSearchedQuery("");
    setSelectedCity("All Cities");
    setPageInput("1");
    setResults([]);
    setTotalCount(0);
    setHasPredicted(false);
    setCategory("OPEN");
    setGender("Male");
    setCapRound("Round 1");
    setMinPercentile("0");

    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleStartPredicting = () => {
    setPercentile("");
    setBranchSearch("");
    setLastSearchedQuery("");
    setSelectedCity("All Cities");
    setPageInput("1");
    setCategory("OPEN");
    setGender("Male");
    setCapRound("All Rounds");
    setMinPercentile("0");
    setResults([]);
    setTotalCount(0);
    setCurrentPage(1);
    setHasPredicted(false);
    try {
      sessionStorage.removeItem("predictorState");
      sessionStorage.setItem("clgPredictViewMode", "predictor");
      window.history.replaceState({ ...(window.history.state || {}), predictorState: undefined }, "");
    } catch {
      // Ignore storage/history failures in private browsing modes.
    }
    setViewMode("predictor");
    fetchPredictions(1, "", "-1", "OPEN", "Male", "All Rounds", "0", "All Cities");
  };

  useEffect(() => {
    if (typeof window === "undefined" || viewMode === "predictor") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "predictor") {
      const timer = setTimeout(() => {
        const savedState = readSavedPredictorState();
        const restored = restorePredictorState(savedState);
        window.history.replaceState({ ...(window.history.state || {}), predictorState: savedState ?? predictorStateRef.current }, "", window.location.pathname);
        try { sessionStorage.setItem("clgPredictViewMode", "predictor"); } catch { /* ignore */ }
        setViewMode("predictor");
        if (!restored) setHasPredicted(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [readSavedPredictorState, restorePredictorState, viewMode]);
  
  const scrollToSection = (sectionId: string) => {
    handleNavigateHome(sectionId);
  };
  
  const handleSearchSubmit = (query: string) => {
    if (query.trim() === "" && !percentile) return;
    setLastSearchedQuery(query.trim());
    fetchPredictions(1, query.trim());
  };

  const handlePageJump = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) return;
    const safePage = Math.max(1, Math.min(requestedPage, totalPages || 1));
    setPageInput(String(safePage));
    fetchPredictions(safePage, lastSearchedQuery);
  };

  const handlePredictSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!percentile) return alert("Please enter your percentile score!");
    setBranchSearch(""); // Reset search bar
    setLastSearchedQuery("");
    fetchPredictions(1, "");
  };

  const handleResetAll = () => {
    setPercentile("");
    setBranchSearch("");
    setLastSearchedQuery("");
    setSelectedCity("All Cities");
    setPageInput("1");
    setCategory("OPEN");
    setGender("Male");
    setCapRound("All Rounds");
    setMinPercentile("0");
    setResults([]);
    setTotalCount(0);
    setHasPredicted(false);
    setCurrentPage(1);
    // Fetch all data with no percentile filter (percentile=-1 means no filter)
    fetchPredictions(1, "", "-1", "OPEN", "Male", "All Rounds", "0", "All Cities");
  };

  const handleScrollToBottom = () => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: "smooth" });
    }
  }; // Kept for reference; handleScrollToggle is the main handler now

  // scroll toggle state: true when at bottom (show scroll-to-top), false otherwise
  const [isAtBottom, setIsAtBottom] = useState<boolean>(false);

  // Reliable scroll detection on the results panel
  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = panel;
      // Trigger at bottom when within 10px of the end
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setIsAtBottom(atBottom);
    };
    
    // Attach scroll listener
    panel.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check immediately
    handleScroll();
    
    // Also recheck after a short delay to catch DOM updates
    const timer = setTimeout(handleScroll, 100);
    
    return () => {
      panel.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [hasPredicted, results.length]); // Re-attach when results load

  const handleScrollToggle = () => {
    if (!rightPanelRef.current) return;
    if (isAtBottom) {
      // Scroll to top
      rightPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll to bottom
      rightPanelRef.current.scrollTo({ top: rightPanelRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const filteredResults = results;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
 
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900 font-sans overflow-auto selection:bg-amber-300/40 flex flex-col">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Fredoka:wght@400;600&family=Marker+Felt&display=swap');
        @keyframes pulseGlow { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-1deg); } 50% { transform: rotate(1deg); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes markerSweep { 0% { background-size: 0% 55%; } 100% { background-size: 100% 55%; } }
        @keyframes stripWave { 0%, 100% { transform: translateX(0) rotate(var(--tilt, 0deg)); } 50% { transform: translateX(10px) rotate(calc(var(--tilt, 0deg) * -1)); } }
        @keyframes stripReveal { 0% { background-position: 100% 70%; } 100% { background-position: 0 70%; } }
        @keyframes contactPulse { 0%, 100% { box-shadow: 0 24px 70px rgba(30, 64, 175, .22); } 50% { box-shadow: 0 30px 90px rgba(245, 158, 11, .28); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .handwritten { font-family: 'Caveat', 'Fredoka', cursive; font-weight: 700; }
        .marker-style { font-family: 'Marker Felt', cursive; letter-spacing: 0.5px; }
        .sticky-note { 
          position: relative; 
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          box-shadow: -2px 2px 8px rgba(0,0,0,0.1), 0 0 20px rgba(251,191,36,0.3);
          transform: rotate(-2deg);
          border-left: 4px solid #f59e0b;
        }
        .sticky-note:nth-child(even) { transform: rotate(1deg); }
        .sticky-note:nth-child(3n) { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); border-left-color: #ec4899; }
        .sticky-note:nth-child(5n) { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left-color: #3b82f6; }
        .highlight-yellow { background: linear-gradient(120deg, transparent 0%, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0.5) 100%, transparent 100%); }
        .highlight-pink { background: linear-gradient(120deg, transparent 0%, rgba(244,114,182,0.4) 0%, rgba(244,114,182,0.4) 100%, transparent 100%); }
        .highlight-blue { background: linear-gradient(120deg, transparent 0%, rgba(96,165,250,0.4) 0%, rgba(96,165,250,0.4) 100%, transparent 100%); }
        .highlight-sweep {
          background-image: linear-gradient(100deg, rgba(253, 224, 71, 0.1), rgba(253, 224, 71, 0.85) 45%, rgba(253, 224, 71, 0.35));
          background-repeat: no-repeat;
          background-position: 0 70%;
          background-size: 0% 55%;
        }
        .scroll-pop.opacity-100 .highlight-sweep,
        .highlight-sweep.is-on {
          animation: markerSweep 1s ease-out forwards;
        }
        .open-notebook {
          border-radius: 28px 34px 30px 26px;
          background:
            linear-gradient(90deg, transparent calc(50% - 1px), rgba(148,163,184,.35) calc(50% - 1px), rgba(148,163,184,.35) calc(50% + 1px), transparent calc(50% + 1px)),
            radial-gradient(circle at 0 0, rgba(15,23,42,.08), transparent 18%),
            radial-gradient(circle at 100% 0, rgba(15,23,42,.08), transparent 18%),
            radial-gradient(circle at 0 100%, rgba(15,23,42,.08), transparent 18%),
            radial-gradient(circle at 100% 100%, rgba(15,23,42,.08), transparent 18%),
            repeating-linear-gradient(0deg, rgba(255,255,255,.98) 0 31px, rgba(219,234,254,.85) 32px);
        }
        .purpose-card { transform: translateY(var(--lift, 0px)) rotate(var(--tilt)); }
        .purpose-card:hover { transform: translateY(-24px) rotate(0deg) scale(1.06); z-index: 10; box-shadow: 0 24px 55px rgba(15, 23, 42, .22), 0 0 0 3px rgba(255,255,255,.9) inset; }
        .purpose-card::after {
          content: "";
          position: absolute;
          inset: auto 18px 12px 18px;
          height: 12px;
          border-radius: 999px;
          background: rgba(15,23,42,.12);
          filter: blur(9px);
          opacity: .55;
          transition: opacity .25s ease;
        }
        .purpose-card:hover::after { opacity: .85; }
        .note-title { transform: rotate(-1.5deg); }
        .work-strip { --tilt: 0deg; animation: stripWave 5s ease-in-out infinite; animation-delay: var(--delay, 0s); }
        .work-strip.opacity-100 {
          background-image: linear-gradient(100deg, rgba(253,224,71,.24), rgba(253,224,71,.72) 38%, rgba(255,255,255,.92) 39%);
          background-size: 220% 100%;
          animation: stripWave 5s ease-in-out infinite, stripReveal 1.1s ease-out both;
          animation-delay: var(--delay, 0s), var(--delay, 0s);
        }
        .contact-pop { animation: contactPulse 3.8s ease-in-out infinite; }
        .pencil-underline { position: relative; padding-bottom: 2px; border-bottom: 2px dashed #d4a574; }
        .diary-entry { background: linear-gradient(to right, #f5f3f0 1px, transparent 1px); background-size: 2px 20px; background-position: 0 0; background-repeat: repeat-y; }
        .college-card-sketch { border: 2px solid #8b7355; border-radius: 8px; box-shadow: 3px 3px 0px rgba(139, 115, 85, 0.2); }
      `}</style>
 
      {/* FIXED NAVBAR */}
      <nav className="w-full bg-white/20 backdrop-blur-xl border-b border-white/30 fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection("hero")}> 
          <div className="h-9 w-9 bg-white/80 rounded-xl flex items-center justify-center shadow-md shadow-slate-500/10 border border-slate-200">
            <GraduationCap className="h-5 w-5 text-slate-900" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            Clg<span className="font-[family-name:var(--font-caveat)] text-2xl text-slate-700">Predict</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1 bg-white/60 p-1 rounded-full border border-slate-200 backdrop-blur-sm shadow-sm">
          {["hero", "purpose", "howToUse", "about", "contact"].map((sec) => (
            <button key={sec} onClick={() => scrollToSection(sec)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === "landing" && activeSection === sec ? "bg-slate-900 text-white shadow-md" : "text-slate-700 hover:text-slate-900"}`}>{sec === "hero" ? "Home" : sec === "howToUse" ? "How" : sec}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <div className="flex items-center gap-4">
              <button onClick={() => {
                try { sessionStorage.setItem('predictorState', JSON.stringify(predictorStateRef.current)); } catch (e) { }
                router.push('/my-list');
              }} className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-slate-700 transition-colors">
                <Bookmark className="h-4 w-4" /> My List
                {bookmarks.length > 0 && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{bookmarks.length}</span>
                )}
              </button>
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9 ring-2 ring-slate-300/80" } }} />
            </div>
          ) : (
            <SignInButton mode="modal">
              <button className="text-xs font-bold py-2.5 px-5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all tracking-wide shadow-lg shadow-slate-900/10">
              </button>
            </SignInButton>
          )}
        </div>
      </nav>
 
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col pt-[73px] min-h-0 relative">
        {viewMode === "landing" && (
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar relative bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50 snap-y snap-mandatory scroll-smooth">
              <div className="fixed inset-0 pointer-events-none z-0">
                <div className="w-full h-full bg-cover bg-center bg-no-repeat bg-fixed opacity-72 blur-[2px] scale-[1.02]" style={{ backgroundImage: "url('/college.jpg')" }} />
                <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-blue-50/35 to-slate-50/80" />
                <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-slate-50/70 to-transparent" />
              </div>
            {/* HERO SECTION */}
            <section id="hero" ref={heroRef} className="max-w-6xl mx-auto px-6 py-8 md:py-10 flex flex-col items-center min-h-[calc(100vh-73px)] justify-center relative z-10 snap-start">
              <div className="open-notebook relative w-full overflow-hidden border-2 border-slate-300 shadow-2xl shadow-slate-900/25">
                <div className="absolute inset-y-8 left-1/2 hidden -translate-x-1/2 flex-col justify-around md:flex">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <span key={index} className="h-3 w-3 rounded-full bg-slate-300 shadow-inner" />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-3 rounded-[24px] border border-dashed border-slate-300/80" />
                <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 p-8 md:p-12 pb-14">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-slate-500 font-semibold uppercase tracking-[0.35em] text-[10px]">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm">✏️</span>
                      College Planner
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-tight handwritten">
                      Your Path To The Perfect <span className="highlight-sweep is-on px-1 text-blue-950">College</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-700 marker-style leading-relaxed max-w-2xl">
                      Start predicting with a smart campus notebook. Write your score, mark your preferences, and turn confusing cutoff sheets into a clear college shortlist.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-blue-50 text-blue-900 px-3 py-2 text-xs font-semibold">MHT-CET 2026</span>
                      <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-2 text-xs font-semibold">College Match</span>
                      <span className="rounded-full bg-slate-100 text-slate-900 px-3 py-2 text-xs font-semibold">Live Cutoffs</span>
                    </div>
                    <button onClick={handleStartPredicting} className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-4 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800">
                      Start Predicting
                    </button>
                  </div>
                  <div className="rounded-[26px] border-2 border-amber-200 bg-yellow-50/90 p-6 shadow-xl shadow-slate-900/15 rotate-1">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-bold mb-4">Quick Start Guide</div>
                    <div className="space-y-4 text-slate-700 marker-style">
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-bold text-slate-900">01. Enter Score</div>
                        <p className="text-[13px] mt-1">Add your percentile or rank for the best suggestions.</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-bold text-slate-900">02. Choose Filters</div>
                        <p className="text-[13px] mt-1">Select category, gender, CAP round and branch preferences.</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-bold text-slate-900">03. View Matches</div>
                        <p className="text-[13px] mt-1">See colleges that match your profile instantly.</p>
                      </div>
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-bold text-slate-900">04. Save Favorites</div>
                        <p className="text-[13px] mt-1">Bookmark your top choices for quick comparison.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
 
            {/* PURPOSE SECTION */}
            <section id="purpose" ref={purposeRef} className="bg-white/45 border-y border-blue-200/60 px-6 py-8 md:py-10 relative z-10 backdrop-blur-[5px] min-h-[calc(100vh-73px)] flex items-center snap-start">
              <div className="max-w-6xl mx-auto w-full">
                <div className="text-center mb-10 md:mb-12 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
                  <span className="text-xs text-blue-700 uppercase font-black tracking-widest block mb-3">✍️ Why Choose Us</span>
                  <div className="note-title inline-block sticky-note border-2 border-amber-300 px-8 py-5">
                    <h2 className="text-3xl md:text-5xl font-black text-blue-950 tracking-tight handwritten">Why Use This Tool</h2>
                  </div>
                  <p className="text-slate-800 text-sm md:text-base mt-8 max-w-2xl mx-auto leading-relaxed font-semibold marker-style">
                    We&apos;ve made college selection <span className="highlight-yellow px-1">fast</span>, <span className="highlight-blue px-1">clear</span>, and <span className="highlight-pink px-1">student-friendly</span>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-5 items-start">
                  {[
                    { icon: "Match", title: "Smart Matching", desc: "Your score and filters quickly point toward the strongest options.", tilt: "-4deg", lift: "8px" },
                    { icon: "Data", title: "Complete Database", desc: "All CSV cutoff entries stay searchable with city and CAP details.", tilt: "2deg", lift: "0px" },
                    { icon: "Filter", title: "Detailed Filters", desc: "Filter by category, gender, round, branch, and college code.", tilt: "-1deg", lift: "14px" },
                    { icon: "Focus", title: "Less Confusion", desc: "Keep your admission choices calm, sorted, and ready before CAP rounds.", tilt: "4deg", lift: "4px" }
                  ].map((card, i) => (
                    <div key={i} style={{ "--tilt": card.tilt, "--lift": card.lift } as React.CSSProperties} className="purpose-card scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out sticky-note p-5 md:p-6 rounded-lg flex min-h-[200px] md:min-h-[220px] flex-col justify-between cursor-pointer">
                      <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-700 mb-5">{card.icon}</div>
                      <h3 className="text-base font-black text-slate-900 mb-2 handwritten">{card.title}</h3>
                      <p className="text-xs text-slate-800 leading-relaxed marker-style">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
 
            {/* HOW TO USE SECTION */}
            <section id="howToUse" ref={howToUseRef} className="px-6 py-8 md:py-10 max-w-6xl mx-auto w-full relative z-10 min-h-[calc(100vh-73px)] flex flex-col justify-center snap-start">
              <div className="text-center mb-8 md:mb-10 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
                <span className="text-xs text-indigo-700 uppercase font-black tracking-widest block mb-3">Get Started In 4 Steps</span>
                <h2 className="inline-block text-3xl md:text-5xl font-black text-blue-950 tracking-tight handwritten">
                  <span className="highlight-sweep px-2">How It Works</span>
                </h2>
              </div>
              <div className="relative z-10 space-y-4">
                {[
                  { step: "01", title: "Enter Your Score", desc: "Type your MHT-CET percentile and keep the minimum score range open or strict.", tilt: "-1deg", delay: "0s" },
                  { step: "02", title: "Set Preferences", desc: "Choose category, gender, CAP round, city, and branch direction in seconds.", tilt: "1deg", delay: ".15s" },
                  { step: "03", title: "View Matches", desc: "Results appear from highest cutoff percentile to lower options after every filter.", tilt: "-0.5deg", delay: ".3s" },
                  { step: "04", title: "Save & Arrange", desc: "Bookmark colleges, drag your preference order, and export the final list as PDF.", tilt: "0.8deg", delay: ".45s" }
                ].map((item) => (
                  <div key={item.step} style={{ "--tilt": item.tilt, "--delay": item.delay } as React.CSSProperties} className="work-strip scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out flex flex-col gap-4 rounded-lg border-2 border-dashed border-blue-200 bg-white/95 px-5 md:px-6 py-4 shadow-xl shadow-slate-900/10 md:flex-row md:items-center md:min-h-[108px] hover:-translate-y-2 hover:shadow-2xl">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-yellow-200 text-2xl font-black text-blue-950 shadow-inner handwritten">{item.step}</div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="text-xl font-black text-black handwritten">{item.title}</h4>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 marker-style">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
             {/* ABOUT US SECTION */}
            <section id="about" ref={aboutRef} className="bg-white/50 border-y border-blue-200/60 px-6 py-8 md:py-10 relative z-10 backdrop-blur-[4px] min-h-[calc(100vh-73px)] flex items-center snap-start">
              <div className="max-w-6xl mx-auto scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
                <div className="open-notebook border-2 border-amber-200 p-8 md:p-14 rounded-[28px] relative overflow-hidden shadow-2xl shadow-slate-900/10">
                  <div className="absolute inset-y-8 left-1/2 hidden w-px bg-slate-300 md:block" />
                  <div className="grid gap-10 md:grid-cols-2 md:items-center">
                    <div>
                      <span className="text-xs text-blue-700 uppercase font-black tracking-widest block mb-3">About ClgPredict</span>
                      <h2 className="text-3xl md:text-5xl font-black text-blue-950 tracking-tight handwritten">A bigger, clearer planner for real admission decisions</h2>
                    </div>
                    <div className="text-slate-800 text-sm md:text-base leading-8 font-semibold marker-style">
                      <p>
                        ClgPredict helps students explore <span className="highlight-yellow px-1">MHT-CET cutoff data</span>, compare colleges by <span className="highlight-blue px-1">city, branch, category, CAP round</span>, and shortlist options without jumping through spreadsheets.
                      </p>
                      <p className="mt-5">
                        The website takes your <span className="highlight-yellow px-1">percentile</span>, applies your <span className="highlight-blue px-1">filters</span>, shows possible colleges, then lets you <span className="highlight-pink px-1">bookmark, reorder, and export</span> your final preference list as a PDF.
                      </p>
                      <p className="mt-5">
                        In short: search faster, compare smarter, and keep every important college option in one clean place.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
             {/* CONTACT SECTION */}
            <section id="contact" ref={contactRef} className="px-6 py-8 md:py-10 max-w-5xl mx-auto w-full text-center relative z-10 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out min-h-[calc(100vh-73px)] flex items-center snap-start">
              <div className="contact-pop relative min-h-[560px] w-full overflow-hidden rounded-[28px] border-2 border-blue-300 bg-white/95 p-8 md:p-14 shadow-2xl shadow-blue-900/20 ring-4 ring-white/70 flex flex-col justify-center">
                <div className="absolute left-0 top-0 h-full w-3 bg-gradient-to-b from-blue-500 via-amber-300 to-pink-400" />
                <div className="absolute right-6 top-6 hidden h-20 w-20 rotate-6 rounded-lg bg-yellow-200/80 shadow-lg md:block" />
                <span className="text-xs text-blue-700 uppercase font-black tracking-widest block mb-3 handwritten">Need Help?</span>
                <h2 className="text-4xl md:text-6xl font-black text-blue-950 tracking-tight mb-5 handwritten">Get In Touch</h2>
                <p className="text-slate-700 text-sm md:text-lg mb-12 max-w-2xl mx-auto leading-relaxed font-semibold marker-style">
                  Questions, corrections, or feedback? Reach out and we will help you keep your admission plan clear.
                </p>
                <div className="grid gap-6 text-left md:grid-cols-2">
                  <div className="sticky-note border-2 border-blue-300 p-6 md:p-8 rounded-lg flex items-center gap-5 transition-all hover:-translate-y-2 hover:scale-[1.02]">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 font-black text-xl">@</div>
                    <div><div className="text-[10px] text-slate-700 uppercase font-bold tracking-wider handwritten">Email</div><div className="text-sm font-black text-blue-950 marker-style">support@clgpredict.com</div></div>
                  </div>
                  <div className="sticky-note border-2 border-pink-300 p-6 md:p-8 rounded-lg flex items-center gap-5 transition-all hover:-translate-y-2 hover:scale-[1.02]">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-900 font-black text-xl">?</div>
                    <div><div className="text-[10px] text-slate-700 uppercase font-bold tracking-wider handwritten">Call</div><div className="text-sm font-black text-blue-950 marker-style">+91 98765 43210</div></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
 
        {/* DASHBOARD PREDICTOR CORE WITH HOVER EXPANDABLE SIDEBAR */}
        {viewMode === "predictor" && (
          !isAllowed ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
              <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full blur-3xl pointer-events-none" />
                <div className="h-16 w-16 bg-red-100 border border-red-300 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PanelLeftClose className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-black text-blue-900 mb-2">Access Restricted</h2>
                <p className="text-sm text-slate-700 mb-8 leading-relaxed font-medium">
                  Your account is currently pending approval or has been blocked by the administrator. You cannot access the predictor at this time.
                </p>
                <button
                  onClick={() => setViewMode("landing")}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors border border-blue-600 text-sm"
                >
                  Return to Home
                </button>
              </div>
            </div>
          ) : (
          <div className="flex-1 flex h-[calc(100vh-73px)] w-full overflow-hidden relative">
            
            {/* HOVER EXPANDABLE SIDEBAR */}
            <aside 
              onMouseEnter={() => setIsSidebarExpanded(true)}
              onMouseLeave={() => setIsSidebarExpanded(false)}
              className={`h-full bg-gradient-to-b from-blue-50 to-indigo-50 border-r border-blue-200/60 flex flex-col p-4 shrink-0 shadow-lg overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-80' : 'w-20'}`}
            >
              <div className={`flex items-center gap-2 mb-6 pb-4 border-b-2 border-dashed border-amber-400 ${isSidebarExpanded ? 'justify-start px-2' : 'justify-center'}`}>
                {isSidebarExpanded ? <PanelLeftClose className="h-5 w-5 text-blue-700 font-bold" /> : <PanelLeft className="h-6 w-6 text-blue-700" />}
                {isSidebarExpanded && (
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wider animate-fadeIn handwritten">⚙️ Filters</span>
                )}
              </div>
 
              <form onSubmit={handlePredictSubmit} className="space-y-5 flex-1 flex flex-col items-center">
                
                {/* 1. Percentile Field */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-white border border-blue-300 rounded-lg flex items-center justify-center text-blue-700 shadow cursor-pointer font-bold" title="Percentile" onClick={() => setIsSidebarExpanded(true)}>%</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2">Your Percentile Score</label>
                      <input type="number" step="any" min="0" max="100" required value={percentile} onChange={(e) => setPercentile(e.target.value)} placeholder="e.g. 95.84" className="w-full bg-white border border-blue-300 rounded-lg px-4 py-3 text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all" />
                    </div>
                  )}
                </div>
 
                {/* 2. Min Percentile Field */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-white border border-blue-300 rounded-lg flex items-center justify-center text-indigo-700 shadow cursor-pointer" title="Min Percentile Limit" onClick={() => setIsSidebarExpanded(true)}><ArrowDownNarrowWide className="h-4 w-4" /></div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5"><ArrowDownNarrowWide className="h-3.5 w-3.5 text-indigo-700" /> Show Colleges Down To</label>
                      <select value={minPercentile} onChange={(e) => setMinPercentile(e.target.value)} className="w-full bg-white border border-blue-300 rounded-lg px-4 py-3 text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs transition-all">
                        <option value="0">0% Percentile (Show All)</option><option value="40">40% Percentile Limit</option><option value="60">60% Percentile Limit</option><option value="75">75% Percentile Limit</option><option value="85">85% Percentile Limit</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 3. Category Reservation */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-white border border-blue-300 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs cursor-pointer" title="Category" onClick={() => setIsSidebarExpanded(true)}>{category.substring(0,3)}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2">Category / Reservation</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white border border-blue-300 rounded-lg px-4 py-3 text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs transition-all">
                        <option value="OPEN">OPEN / General</option><option value="OBC">OBC</option><option value="SC">SC</option><option value="ST">ST</option><option value="EWS">EWS</option><option value="TFWS">TFWS</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 4. Gender Mode */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-white border border-blue-300 rounded-lg flex items-center justify-center text-pink-600 font-bold text-xs cursor-pointer" title="Gender" onClick={() => setIsSidebarExpanded(true)}>{gender[0]}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2">Gender Category</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Male", "Female"].map((g) => (
                          <button key={g} type="button" onClick={() => setGender(g)} className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${gender === g ? "bg-blue-700 border-blue-600 text-white shadow-md" : "bg-white border-blue-300 text-blue-900 hover:text-blue-700"}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
 
                {/* 5. Counseling CAP Round */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-white border border-blue-300 rounded-lg flex items-center justify-center text-amber-700 font-mono text-xs font-bold cursor-pointer" title="CAP Round" onClick={() => setIsSidebarExpanded(true)}>{capRound === "All Rounds" ? "ALL" : `R${capRound.split(" ")[1]}`}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2">CAP Counseling Round</label>
                      <select value={capRound} onChange={(e) => setCapRound(e.target.value)} className="w-full bg-white border border-blue-300 rounded-lg px-4 py-3 text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs transition-all">
                        <option value="All Rounds">All CAP Rounds</option><option value="Round 1">CAP Round 1</option><option value="Round 2">CAP Round 2</option><option value="Round 3">CAP Round 3</option><option value="Round 4">CAP Round 4</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 6. Submit Button */}
                <div className="w-full pt-2">
                  <button type="submit" disabled={loading} className={`bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-wider hover:shadow-blue-400/40 ${isSidebarExpanded ? 'w-full py-3 px-4 gap-2' : 'h-10 w-10 mx-auto'}`}>
                    <Search className="h-4 w-4 shrink-0" />
                    {isSidebarExpanded && (loading ? "Searching..." : "Find Colleges")}
                  </button>
                </div>
              </form>
            </aside>
            {/* RESULTS RIGHT PANEL */}
            <main ref={rightPanelRef} className="flex-1 h-full flex flex-col bg-gradient-to-b from-slate-50 to-blue-50 min-w-0 overflow-y-auto custom-scrollbar relative">
              {/* ✅ UPDATED: Dynamic search bar with local/server synchronization */}
              <header className="sticky top-0 z-20 px-8 py-4 border-b-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 backdrop-blur-md flex justify-between items-center gap-4 shrink-0 relative">
                <div className="flex items-center gap-4 w-full max-w-md">
                  <div className="relative w-full">
                    <span className="absolute left-3 top-2.5 text-lg">🔎</span>
                    <input
                      type="text"
                      placeholder={percentile ? "Search branches (e.g., CS, EC)" : "Search college (name or code)"}
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSubmit(branchSearch);
                          setShowRecent(false);
                        }
                      }}
                      onFocus={() => setShowRecent(true)}
                      onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                      className="w-full college-card-sketch border-2 border-amber-400 rounded-lg pl-9 pr-24 py-2 text-xs text-blue-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-amber-200 marker-style placeholder:text-slate-600"
                    />
                    <button 
                      onClick={() => {
                        handleResetAll();
                      }}
                      className="absolute right-12 top-1 bottom-1 px-2 bg-yellow-200 hover:bg-yellow-300 text-blue-900 rounded text-[10px] font-black transition-colors border-2 border-amber-400"
                    >
                      ⟲ CLEAR
                    </button>
                    <button 
                      onClick={() => {
                        handleSearchSubmit(branchSearch);
                        setShowRecent(false);
                      }}
                      className="absolute right-1 top-1 bottom-1 px-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-[10px] font-black transition-colors border-2 border-blue-600"
                    >
                      GO 🚀
                    </button>
                    
                    {/* RECENT SEARCHES DROPDOWN */}
                    {showRecent && (percentile ? recentBranchSearches : recentCollegeSearches).length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-yellow-100 border-2 border-amber-400 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-dashed border-amber-400 bg-yellow-50 handwritten">
                          📋 Recent {percentile ? "Branch" : "College"}
                        </div>
                        {(percentile ? recentBranchSearches : recentCollegeSearches).map((recent, idx) => (
                          <div 
                            key={idx}
                            className="px-3 py-2 text-xs text-slate-900 hover:bg-amber-200 cursor-pointer flex items-center gap-2 marker-style hover:font-bold transition-all"
                            onClick={() => {
                              setBranchSearch(recent);
                              handleSearchSubmit(recent);
                              setShowRecent(false);
                            }}
                          >
                            <span>📌</span>
                            <span className="truncate">{recent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs sticky-note border-2 border-blue-300 px-3 py-2 rounded-lg font-black text-blue-900 whitespace-nowrap handwritten">
                    📚 {totalCount} Colleges
                  </div>
                  <div className="flex items-center gap-2 bg-white/90 border border-blue-200 rounded-full px-3 py-2 shadow-sm">
                    <label htmlFor="cityFilter" className="text-[10px] tracking-[0.24em] uppercase text-slate-500">City</label>
                    <div className="flex items-center gap-2">
                      <select
                        id="cityFilter"
                        value={selectedCity}
                        onChange={(e) => {
                          const nextCity = e.target.value;
                          setSelectedCity(nextCity);
                          setPageInput("1");
                          setCurrentPage(1);
                          const q = branchSearch.trim() || lastSearchedQuery;
                          fetchPredictions(1, q, undefined, undefined, undefined, undefined, undefined, nextCity);
                        }}
                        className="bg-white border border-slate-200 text-[11px] text-slate-800 rounded-full px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {cityOptions.length === 0 && <option>All Cities</option>}
                        {cityOptions.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                      {citiesLoading ? (
                        <div className="text-[11px] text-slate-500">Loading...</div>
                      ) : cityOptions.length <= 1 ? (
                        <button onClick={reloadCities} className="text-[11px] text-blue-700 underline">Retry</button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {/* Animated Loading Bar */}
                {loading && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 animate-pulse z-30" />
                )}
              </header>
 
              <div className={`flex-1 p-6 min-h-0 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                {hasPredicted && results.length > 0 && !loading && (
                  <button
                    onClick={handleScrollToggle}
                    className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900/95 text-white px-4 py-3 text-xs font-bold shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-300"
                  >
                    {isAtBottom ? (
                      <>
                        Scroll to Top
                        <ArrowUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Scroll to Bottom
                        <ArrowDownNarrowWide className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
                {!hasPredicted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-20">
                    <div className="text-6xl mb-3">📔</div>
                    <h3 className="text-sm font-bold text-slate-700 handwritten">Start Your College Journey</h3>
                    <p className="text-xs text-slate-600 mt-1 marker-style">Adjust filters on the left and search to find your perfect college match!</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-20">
                    <div className="text-6xl mb-3">🔍</div>
                    <h3 className="text-sm font-bold text-slate-700 handwritten">No Colleges Found</h3>
                    <p className="text-xs text-slate-600 mt-1 marker-style">Try adjusting your criteria. You&apos;ve got this! 💪</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
                      {filteredResults.map((item, index) => (
                        <div key={`${item.choice_code}-${index}`} className="college-card-sketch bg-white p-5 transition-all flex flex-col justify-between hover:shadow-lg hover:scale-105 relative overflow-hidden group">
                          {/* Diary line background effect */}
                          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 19px, #1e40af 19px, #1e40af 20px)' }} />
                          
                          <div className="relative z-10">
                            <div className="flex justify-between items-start gap-2 mb-3">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-100 text-amber-900 border border-amber-300 font-bold">📍 {item.college_code}</span>
                              </div>
                              <div className="flex gap-1 flex-wrap justify-end items-center">
                                <span className="text-[9px] bg-pink-100 text-pink-900 px-2 py-0.5 rounded font-bold border border-pink-300 whitespace-nowrap">🔄 CAP {item.cap_round}</span>
                                <span className="text-[9px] bg-green-100 text-green-900 px-2 py-0.5 rounded font-bold border border-green-300 whitespace-nowrap">💺 {item.seat_type}</span>
                                <span className="text-[9px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold border border-blue-300 whitespace-nowrap">📊 {item.stage}</span>
                                <button 
                                  onClick={() => {
                                    if (isBookmarked(item.choice_code, item.seat_type, item.cap_round, item.quota_allocation)) {
                                      const b = bookmarks.find(
                                        x =>
                                          x.choice_code === item.choice_code &&
                                          x.seat_type === item.seat_type &&
                                          x.cap_round === item.cap_round &&
                                          x.quota_allocation === item.quota_allocation
                                      );
                                      if (b) removeBookmark(b.id);
                                    } else {
                                      const newBookmark: BookmarkItem = {
                                        id: crypto.randomUUID(),
                                        college_name: item.college_name,
                                        college_code: item.college_code,
                                        seat_type: item.seat_type,
                                        cap_round: item.cap_round,
                                        cutoff_percentile: item.cutoff_percentile,
                                        branch_name: item.branch_name,
                                        cutoff_rank: item.cutoff_rank,
                                        choice_code: item.choice_code,
                                        home_university: item.home_university,
                                        quota_allocation: item.quota_allocation,
                                        category,
                                      };
                                      addBookmark(newBookmark);
                                    }
                                  }}
                                  className="ml-1 p-1.5 hover:bg-yellow-200 rounded transition-colors"
                                  title={isBookmarked(item.choice_code, item.seat_type, item.cap_round, item.quota_allocation) ? "Remove Bookmark" : "Bookmark this"}
                                >
                                  {isBookmarked(item.choice_code, item.seat_type, item.cap_round, item.quota_allocation) ? (
                                    <span className="text-lg">⭐</span>
                                  ) : (
                                    <span className="text-lg">⬚</span>
                                  )}
                                </button>
                              </div>
                            </div>
                            <h4 className="text-lg font-black text-black leading-snug line-clamp-2 mb-2 font-[family-name:var(--font-caveat)]">{item.college_name}</h4>
                            <div className="flex items-center gap-1 text-[11px] text-slate-700 mb-3">
                              <span>📍</span> <span className="truncate marker-style">{item.home_university}</span>
                            </div>
                            <div className="mb-3 inline-flex max-w-full items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-900 border border-slate-300">
                              <span>Quota</span>
                              <span className="truncate">{item.quota_allocation}</span>
                            </div>
                            <div className="diary-entry border-2 border-dashed border-amber-300 rounded-lg p-3 bg-amber-50/40 flex justify-between items-center text-xs gap-2">
                              <div className="truncate pr-2">
                                <div className="text-[9px] text-slate-700 font-black uppercase">📚 Branch</div>
                                <div className="font-bold text-slate-900 truncate max-w-[180px] marker-style">{item.branch_name}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[9px] text-slate-700 font-black uppercase">Code</div>
                                <div className="font-mono text-slate-800 text-[11px] font-bold">{item.choice_code}</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t-2 border-dashed border-blue-300 flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold"><span>🏆</span><span>Rank: <strong className="text-slate-900 marker-style">{item.cutoff_rank.toLocaleString()}</strong></span></div>
                            <div className="text-right"><span className="text-lg font-black handwritten text-blue-900 highlight-blue px-2">{item.cutoff_percentile}%</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
 
                    {/* PAGINATION PANEL */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 pb-8 border-t border-blue-200/60">
                        <div className="flex items-center gap-3">
                          <button onClick={() => fetchPredictions(currentPage - 1, lastSearchedQuery)} disabled={currentPage === 1 || loading} className="p-2 rounded-lg college-card-sketch bg-yellow-100 border-2 border-amber-400 text-blue-900 hover:bg-yellow-200 disabled:opacity-40 transition-colors font-bold text-lg">⬅️</button>
                          <span className="text-xs font-bold px-4 py-2 sticky-note rounded-lg">📄 Page <span className="handwritten text-lg">{currentPage} / {totalPages}</span></span>
                          <button onClick={() => fetchPredictions(currentPage + 1, lastSearchedQuery)} disabled={currentPage === totalPages || loading} className="p-2 rounded-lg college-card-sketch bg-yellow-100 border-2 border-amber-400 text-blue-900 hover:bg-yellow-200 disabled:opacity-40 transition-colors font-bold text-lg">➡️</button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-2">
                          <label htmlFor="pageJump" className="text-[10px] uppercase tracking-[0.24em] text-slate-600">Jump to</label>
                          <input
                            id="pageJump"
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handlePageJump();
                            }}
                            className="w-16 text-center text-sm rounded-full border border-slate-300 bg-white px-2 py-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                          <button onClick={handlePageJump} disabled={loading} className="text-[10px] font-bold uppercase tracking-[0.24em] bg-blue-700 text-white rounded-full px-3 py-2 hover:bg-blue-600 transition-colors disabled:opacity-50">Go</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </main>
          </div>
          )
        )}
      </div>
    </div>
  );
}
