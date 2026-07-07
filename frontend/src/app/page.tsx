"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useBookmarks, BookmarkItem } from "@/context/BookmarkContext";
import { SiteNavbar } from "@/components/SiteNavbar";
import { ViewTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
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
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"landing" | "predictor">("landing");
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [pendingPredictorAccess, setPendingPredictorAccess] = useState(false);
  
  // Access Control: Block if explicitly set to false
  const isAllowed = user?.publicMetadata?.isAllowed !== false;
  const showPredictor = viewMode === "predictor" && isSignedIn;
 
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
    if (showPredictor) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 });
 
    const refs = [heroRef, purposeRef, howToUseRef, aboutRef, contactRef];
    refs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, []);
 
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
  }, []);

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
      try { sessionStorage.setItem("clgPredictPendingRoute", "predictor"); } catch {}
      openSignIn();
      return;
    }
    router.push("/predictor");
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
        variant="home"
        viewMode={viewMode}
        activeSection={activeSection}
        onNavigateSection={scrollToSection}
        onOpenPredictor={handleStartPredicting}
        onGoHome={() => scrollToSection("hero")}
        onGoMyList={goToMyList}
      />
 
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col pt-[73px] min-h-0 relative overflow-hidden">
        {/* Fixed Background */}
        <div className="fixed inset-0 pointer-events-none z-0 top-[73px]">
          <div className="w-full h-full bg-cover bg-center bg-no-repeat bg-fixed opacity-72 blur-[2px]" style={{ backgroundImage: "url('/college.jpg')" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-blue-50/35 to-slate-50/80" />
          <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-slate-50/70 to-transparent" />
        </div>
        {/* Scrollable Content */}
        <div className="w-full flex-1 relative z-10 bg-transparent overflow-y-auto overflow-x-hidden">
            {/* HERO SECTION */}
            <section id="hero" ref={heroRef} className="max-w-6xl mx-auto px-6 py-8 md:py-16 flex flex-col items-center justify-center relative z-10 mt-4 md:mt-12">
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
            <section id="purpose" ref={purposeRef} className="bg-white/45 border-y border-blue-200/60 px-6 py-16 md:py-24 relative z-10 backdrop-blur-[5px] flex items-center mt-12 md:mt-24">
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
            <section id="howToUse" ref={howToUseRef} className="px-6 py-16 md:py-24 max-w-6xl mx-auto w-full relative z-10 flex flex-col justify-center mt-8 md:mt-12">
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
            <section id="about" ref={aboutRef} className="bg-white/50 border-y border-blue-200/60 px-6 py-16 md:py-24 relative z-10 backdrop-blur-[4px] flex items-center mt-12 md:mt-24">
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
            <section id="contact" ref={contactRef} className="px-6 py-16 md:py-24 max-w-5xl mx-auto w-full text-center relative z-10 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out flex items-center mt-8 md:mt-12 mb-12">
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
      </div>
    </div>
  );
}
