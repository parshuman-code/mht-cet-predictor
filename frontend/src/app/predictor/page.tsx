"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useBookmarks, BookmarkItem } from "@/context/BookmarkContext";
import { SiteNavbar } from "@/components/SiteNavbar";
import { ViewTransition } from "@/components/PageTransition";
import { AnimatePresence, motion } from "framer-motion";
import { AuthGate } from "@/components/AuthGate";
import {
  Search, SlidersHorizontal, GraduationCap, MapPin, Award, ChevronLeft, ChevronRight,
  ArrowDownNarrowWide, Mail, Phone, Info, Cpu, Database, Sparkles, Layers,
  ListOrdered, CheckCircle2, ArrowRight, PanelLeftClose, PanelLeft, Bookmark, BookmarkCheck, List, X
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
 
export default function PredictorPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"landing" | "predictor">("predictor");
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [pendingPredictorAccess, setPendingPredictorAccess] = useState(false);
  
  // Access Control: Block if explicitly set to false
  const isAllowed = user?.publicMetadata?.isAllowed !== false;
  const showPredictor = viewMode === "predictor" && isSignedIn;
 
  // Sidebar Hover/Toggle States
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
 
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
    if (showPredictor) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 });
 
    const refs = [heroRef, purposeRef, howToUseRef, aboutRef, contactRef];
    refs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, [showPredictor]);
 
  useEffect(() => {
    if (showPredictor) return;
    const reveal = (el: Element) => {
      el.classList.add("opacity-100", "translate-y-0");
      el.classList.remove("opacity-0", "translate-y-12");
    };
    const elementObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const elements = document.querySelectorAll(".scroll-pop");
    elements.forEach((el) => {
      elementObserver.observe(el);
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) reveal(el);
    });
    return () => elementObserver.disconnect();
  }, [showPredictor]);

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
    if (typeof window === "undefined" || !isLoaded) return;

    const params = new URLSearchParams(window.location.search);
    const shouldOpenPredictor = params.get("view") === "predictor";
    const savedState = readSavedPredictorState();

    if (shouldOpenPredictor && isSignedIn) {
      if (params.get("view") === "predictor") {
        window.history.replaceState({ ...(window.history.state || {}), predictorState: savedState ?? predictorStateRef.current }, "", window.location.pathname);
      }
      const restored = restorePredictorState(savedState);
      setViewMode("predictor");
      if (!restored) setHasPredicted(false);
    } else if (shouldOpenPredictor) {
      window.history.replaceState({ ...(window.history.state || {}), predictorState: savedState ?? predictorStateRef.current }, "", window.location.pathname);
    }

    hasHydratedViewRef.current = true;
  }, [isLoaded, isSignedIn, readSavedPredictorState, restorePredictorState]);

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

  const openPredictor = React.useCallback(() => {
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
  }, [fetchPredictions]);

  const handleStartPredicting = () => {
    if (!isSignedIn) {
      setPendingPredictorAccess(true);
      openSignIn();
      return;
    }
    openPredictor();
  };

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !pendingPredictorAccess) return;
    setPendingPredictorAccess(false);
    openPredictor();
  }, [isLoaded, isSignedIn, pendingPredictorAccess, openPredictor]);

  React.useEffect(() => {
    if (!isLoaded || isSignedIn || viewMode !== "predictor") return;
    setViewMode("landing");
    try { sessionStorage.setItem("clgPredictViewMode", "landing"); } catch { /* ignore */ }
  }, [isLoaded, isSignedIn, viewMode]);

  useEffect(() => {
    if (typeof window === "undefined" || viewMode === "predictor" || !isLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "predictor") {
      if (!isSignedIn) {
        window.history.replaceState({ ...(window.history.state || {}), predictorState: predictorStateRef.current }, "", window.location.pathname);
        return;
      }
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
  }, [readSavedPredictorState, restorePredictorState, viewMode, isLoaded, isSignedIn]);
  
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

  const goToMyList = () => {
    try {
      sessionStorage.setItem("predictorState", JSON.stringify(predictorStateRef.current));
      sessionStorage.setItem("clgPredictViewMode", viewMode);
    } catch {
      // Ignore storage failures in private browsing modes.
    }
    router.push("/my-list");
  };

  const filteredResults = results;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
 
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900 font-sans overflow-hidden selection:bg-amber-300/40 flex flex-col">
      <SiteNavbar
        variant="subpage"
      />
 
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col pt-[73px] min-h-0 relative">
        <AuthGate>
          <div className="flex-1 flex h-[calc(100vh-73px)] w-full overflow-hidden relative">
            
            {/* HOVER EXPANDABLE SIDEBAR & MOBILE BOTTOM SHEET */}
            {/* Mobile Overlay */}
            <div 
              className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 md:hidden ${isMobileFilterOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
              onClick={() => { setIsMobileFilterOpen(false); setIsSidebarExpanded(false); }}
            />
            <aside 
              onMouseEnter={() => setIsSidebarExpanded(true)}
              onMouseLeave={() => setIsSidebarExpanded(false)}
              className={`flex flex-col p-4 shrink-0 shadow-lg overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out bg-gradient-to-b from-blue-50 to-indigo-50 border-blue-200/60
                md:relative md:h-full md:border-r ${isSidebarExpanded ? 'md:w-80' : 'md:w-20'} md:translate-y-0
                fixed inset-x-0 bottom-0 z-50 w-full h-[85vh] rounded-t-3xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.2)] md:rounded-none md:shadow-lg ${isMobileFilterOpen ? 'translate-y-0' : 'translate-y-[100%]'}
              `}
            >
              <div className={`flex items-center gap-2 mb-6 pb-4 border-b-2 border-dashed border-amber-400 ${isSidebarExpanded ? 'justify-between md:justify-start px-2' : 'justify-center'}`}>
                <div className="flex items-center gap-2">
                  {isSidebarExpanded ? <PanelLeftClose className="h-5 w-5 text-blue-700 font-bold hidden md:block" /> : <PanelLeft className="h-6 w-6 text-blue-700 hidden md:block" />}
                  {isSidebarExpanded && (
                    <span className="text-xs font-black text-blue-900 uppercase tracking-wider animate-fadeIn handwritten">⚙️ Filters</span>
                  )}
                </div>
                {isSidebarExpanded && (
                  <button onClick={() => { setIsMobileFilterOpen(false); setIsSidebarExpanded(false); }} className="md:hidden p-1 bg-blue-100 rounded text-blue-800">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
 
              <form onSubmit={(e) => { handlePredictSubmit(e); setIsMobileFilterOpen(false); setIsSidebarExpanded(false); }} className="space-y-5 flex-1 flex flex-col items-center">
                
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
              <header className="sticky top-0 z-20 px-4 sm:px-8 py-4 border-b-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50/95 to-indigo-50/95 backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0 relative">
                <div className="flex items-center gap-2 w-full max-w-md">
                  <button onClick={() => { setIsMobileFilterOpen(true); setIsSidebarExpanded(true); }} type="button" className="sm:hidden flex shrink-0 items-center justify-center h-10 w-10 bg-white border-2 border-blue-300 rounded-lg text-blue-700 shadow-sm">
                    <SlidersHorizontal className="h-5 w-5" />
                  </button>
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
                    className="fixed right-6 bottom-6 z-40 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900/95 text-white h-12 w-40 text-xs font-bold shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all duration-300 overflow-hidden"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isAtBottom ? (
                        <motion.div
                          key="top"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          Scroll to Top
                          <ArrowUp className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="bottom"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          Scroll to Bottom
                          <ArrowDownNarrowWide className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
                      {filteredResults.map((item, index) => (
                        <div
                          key={`${item.choice_code}-${index}`}
                          className={`college-card-sketch bg-white p-5 transition-all flex flex-col justify-between hover:shadow-lg hover:scale-105 relative overflow-hidden group ${filteredResults.length % 2 !== 0 && index === filteredResults.length - 1 ? "sm:col-span-2" : ""}`}
                        >
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
        </AuthGate>
      </div>
    </div>
  );
}
