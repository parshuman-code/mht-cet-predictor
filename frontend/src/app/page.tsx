"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Search, SlidersHorizontal, GraduationCap, MapPin, Award, ChevronLeft, ChevronRight,
  BookOpen, ArrowDownNarrowWide, Mail, Phone, Info, Cpu, Database, Sparkles, Layers,
  ListOrdered, CheckCircle2, ArrowRight, PanelLeftClose, PanelLeft
} from "lucide-react";
 
interface PredictionItem {
  college_code: string; college_name: string; choice_code: string; branch_name: string;
  status: string; home_university: string; quota_allocation: string; seat_type: string;
  stage: string; cutoff_rank: number; cutoff_percentile: number; cap_round: string;
}
 
export default function Home() {
  const [viewMode, setViewMode] = useState<"landing" | "predictor">("landing");
  const [activeSection, setActiveSection] = useState<string>("hero");
 
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
  
  // API Results Control
  const [results, setResults] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasPredicted, setHasPredicted] = useState<boolean>(false);
  const itemsPerPage = 20;
 
  // Backend URL Selection
  const [backendUrl, setBackendUrl] = useState<string>("https://mht-cet-predictor-f8dl.onrender.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
        setBackendUrl("http://localhost:8001");
      }
    }
  }, []);

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

  // Reset Predict page state when navigating away
  useEffect(() => {
    if (viewMode === "landing") {
      setPercentile("");
      setBranchSearch("");
      setLastSearchedQuery("");
      setResults([]);
      setTotalCount(0);
      setHasPredicted(false);
      setCategory("OPEN");
      setGender("Male");
      setCapRound("Round 1");
      setMinPercentile("0");
    } else if (viewMode === "predictor") {
      fetchPredictions(1, "");
    }
  }, [viewMode]);
 
  const scrollToSection = (sectionId: string) => {
    setViewMode("landing");
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
 
  const fetchPredictions = async (
    pageNumber: number, 
    searchQuery: string,
    overridePercentile?: string,
    overrideCategory?: string,
    overrideGender?: string,
    overrideCapRound?: string,
    overrideMinPercentile?: string
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

      const percValue = pVal ? parseFloat(pVal) : -1;
      const apiUrl = `${backendUrl}/predict?percentile=${percValue}&category=${cVal}&gender=${gVal}&cap_round=${rVal}&min_percentile=${mVal}&page=${pageNumber}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(apiUrl, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
      const data = await response.json();
      if (data.status === "success") {
        setResults(data.predictions);
        setTotalCount(data.total_count);
        setCurrentPage(pageNumber);
        setHasPredicted(true);
        setBranchSearch(""); // Auto-clear search box after results load
        if (rightPanelRef.current) rightPanelRef.current.scrollTo({ top: 0, behavior: "instant" });
      }
    } catch (error: unknown) {
      alert(`Connection Error: ${error instanceof Error ? error.message : "Unknown error occured"}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearchSubmit = (query: string) => {
    if (query.trim() === "" && !percentile) return;
    setLastSearchedQuery(query.trim());
    fetchPredictions(1, query.trim());
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
    setCategory("OPEN");
    setGender("Male");
    setCapRound("Round 1");
    setMinPercentile("0");
    fetchPredictions(1, "", "", "OPEN", "Male", "Round 1", "0");
  };
 
  const filteredResults = results;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
 
  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30 flex flex-col">
      <style jsx global>{`
        @keyframes pulseGlow { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.3; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
 
      {/* FIXED NAVBAR */}
      <nav className="w-full bg-slate-950/40 backdrop-blur-md border-b border-slate-900/60 fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center shadow-lg transition-colors duration-300">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection("hero")}>
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">ClgPredict</span>
        </div>
        <div className="hidden md:flex items-center gap-1 bg-slate-900/40 p-1 rounded-full border border-slate-800/50 backdrop-blur-sm">
          {["hero", "purpose", "about", "contact"].map((sec) => (
            <button key={sec} onClick={() => scrollToSection(sec)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${viewMode === "landing" && activeSection === sec ? "bg-slate-800/60 border border-slate-700/30 text-cyan-400 shadow-md" : "text-slate-400 hover:text-slate-200"}`}>{sec === "hero" ? "Home" : sec}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode(viewMode === "predictor" ? "landing" : "predictor")} className="text-xs font-bold py-2.5 px-5 rounded-xl transition-all tracking-wide uppercase border bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-indigo-500/20 text-indigo-300 hover:scale-105 backdrop-blur-sm">
            {viewMode === "predictor" ? "Back To Home" : "Launch Predictor"}
          </button>
        </div>
      </nav>
 
      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col pt-[73px] min-h-0 relative">
        {viewMode === "landing" && (
          <div className="w-full flex-1 overflow-y-auto custom-scrollbar relative bg-slate-950">
            <div className="absolute top-0 left-0 w-full h-[110vh] pointer-events-none z-0 overflow-hidden">
              <div className="w-full h-full bg-cover bg-top bg-no-repeat opacity-35" style={{ backgroundImage: "url('/background.jpeg')" }} />
              <div className="absolute inset-0 bg-slate-950/40" />
              <div className="absolute bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0" style={{ animation: "pulseGlow 6s infinite" }} />
            <div className="absolute top-80 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none z-0" style={{ animation: "pulseGlow 8s infinite alternate" }} />
 
            {/* HERO SECTION */}
            <section id="hero" ref={heroRef} className="max-w-5xl mx-auto text-center px-6 pt-24 pb-24 flex flex-col items-center min-h-[calc(100vh-73px)] justify-center relative z-10">
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-bold mb-8 shadow-inner animate-pulse">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> MHT-CET 2026 Updated Cutoffs Database Live
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-8 leading-[1.15] max-w-5xl">Navigate Maharashtra Admissions With Absolute <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">Certainty</span></h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mb-12 leading-relaxed">Avoid manual PDF verification errors. Plug your core percentile into our cloud processing engine to map ideal institutional counseling seats instantly.</p>
              <button onClick={() => setViewMode("predictor")} className="group bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:opacity-95 text-white font-extrabold py-4 px-10 rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all duration-300 flex items-center gap-3 text-sm tracking-wider uppercase hover:scale-105">
                Start Predicting Colleges <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-200" />
              </button>
            </section>
 
            {/* PURPOSE SECTION */}
            <section id="purpose" ref={purposeRef} className="bg-slate-900/40 border-y border-slate-900/80 py-28 px-6 relative z-10 backdrop-blur-[2px]">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
                  <span className="text-xs text-indigo-400 uppercase font-black tracking-widest block mb-3">System Architecture</span>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Purpose Of Making This Tool</h2>
                  <p className="text-slate-400 text-sm md:text-base mt-4 max-w-2xl mx-auto leading-relaxed">We extracted bulk allocation spreadsheets into optimized search segments so you don't lose crucial choice codes during critical CAP option form fillings.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: <Cpu className="h-5 w-5 text-indigo-400" />, title: "Precision Mapping", desc: "Maps row items strictly matching previous cutoff benchmarks to eliminate random guesses." },
                    { icon: <Database className="h-5 w-5 text-purple-400" />, title: "Structured Querying", desc: "Locks structural bounds securely, avoiding missing any college matrix match." },
                    { icon: <Layers className="h-5 w-5 text-cyan-400" />, title: "Category Isolation", desc: "Applies explicit checks on deep filters like home university, reservation types, and stages." }
                  ].map((card, i) => (
                    <div key={i} className="scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-6 rounded-2xl hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                      <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">{card.icon}</div>
                      <h3 className="text-base font-bold text-slate-100 mb-2">{card.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
 
            {/* HOW TO USE SECTION */}
            <section id="howToUse" ref={howToUseRef} className="py-28 px-6 max-w-5xl mx-auto w-full relative z-10">
              <div className="text-center mb-16 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out"><span className="text-xs text-cyan-400 uppercase font-black tracking-widest block mb-3">Operational Flow</span><h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">How To Use The Predictor</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {[
                  { step: "01", icon: <Sparkles className="h-4 w-4 text-indigo-400" />, title: "Enter Percentile", desc: "Type your official overall normalized score into the primary input dashboard field." },
                  { step: "02", icon: <SlidersHorizontal className="h-4 w-4 text-purple-400" />, title: "Tune Matrix Filters", desc: "Select matching category slots alongside specific gender options parameters." },
                  { step: "03", icon: <ListOrdered className="h-4 w-4 text-cyan-400" />, title: "Set CAP Cycle Loop", desc: "Toggle between Round 1, 2, or 3 to observe dynamic cutoff shift variations." },
                  { step: "04", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, title: "Explore Output", desc: "Filter live institutional matches instantly by entering specialized branch keywords." }
                ].map((item, i) => (
                  <div key={i} className="scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-700 hover:shadow-lg transition-all group">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-2xl font-black font-mono bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text text-transparent group-hover:text-indigo-500/20 transition-colors">{item.step}</span>
                      <div className="h-7 w-7 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center">{item.icon}</div>
                    </div>
                    <div><h4 className="text-sm font-bold text-slate-200 mb-1.5">{item.title}</h4><p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p></div>
                  </div>
                ))}
              </div>
            </section>
 
            {/* ABOUT US SECTION */}
            <section id="about" ref={aboutRef} className="bg-slate-900/40 border-y border-slate-900/80 py-28 px-6 relative z-10">
              <div className="max-w-4xl mx-auto scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                    <div className="h-8 w-8 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex items-center justify-center text-indigo-400"><Info className="h-4 w-4" /></div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">About ClgPredict Engine</h2>
                  </div>
                  <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 text-center md:text-left">ClgPredict is a specialized analytical dashboard optimized exclusively for engineering branch seekers across Maharashtra. By running standalone fast indexing loops connected directly onto compressed database arrays, we ensure high delivery execution speeds—helping you plan perfect institutional priorities safely.</p>
                </div>
              </div>
            </section>
 
            {/* CONTACT SECTION */}
            <section id="contact" ref={contactRef} className="py-28 px-6 max-w-lg mx-auto w-full text-center relative z-10 scroll-pop opacity-0 translate-y-12 transition-all duration-700 ease-out">
              <span className="text-xs text-indigo-400 uppercase font-black tracking-widest block mb-3">Support Channel</span>
              <h2 className="text-3xl font-black text-white tracking-tight mb-3">Get In Touch</h2>
              <p className="text-slate-500 text-xs md:text-sm mb-10 max-w-sm mx-auto leading-relaxed">Facing technical latency or pipeline query mismatch bugs? Contact our developer desk below.</p>
              <div className="space-y-4 text-left">
                <div className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-4 rounded-2xl flex items-center gap-4 transition-all hover:shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0"><Mail className="h-4 w-4" /></div>
                  <div><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Core Support</div><div className="text-xs font-semibold text-slate-200">support@clgpredict.com</div></div>
                </div>
                <div className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-4 rounded-2xl flex items-center gap-4 transition-all hover:shadow-lg">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0"><Phone className="h-4 w-4" /></div>
                  <div><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Developer Desk</div><div className="text-xs font-semibold text-slate-200">+91 98765 43210</div></div>
                </div>
              </div>
            </section>
          </div>
        )}
 
        {/* DASHBOARD PREDICTOR CORE WITH HOVER EXPANDABLE SIDEBAR */}
        {viewMode === "predictor" && (
          <div className="flex-1 flex h-[calc(100vh-73px)] w-full overflow-hidden relative">
            
            {/* HOVER EXPANDABLE SIDEBAR */}
            <aside 
              onMouseEnter={() => setIsSidebarExpanded(true)}
              onMouseLeave={() => setIsSidebarExpanded(false)}
              className={`h-full bg-slate-900 border-r border-slate-800 flex flex-col p-4 shrink-0 shadow-2xl overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-80' : 'w-20'}`}
            >
              <div className={`flex items-center gap-2 mb-6 pb-4 border-b border-slate-800 ${isSidebarExpanded ? 'justify-start px-2' : 'justify-center'}`}>
                {isSidebarExpanded ? <PanelLeftClose className="h-4 w-4 text-cyan-400" /> : <PanelLeft className="h-5 w-5 text-cyan-400" />}
                {isSidebarExpanded && (
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider animate-fadeIn">Matrix Parameters</span>
                )}
              </div>
 
              <form onSubmit={handlePredictSubmit} className="space-y-5 flex-1 flex flex-col items-center">
                
                {/* 1. Percentile Field */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-indigo-400 shadow cursor-pointer" title="Percentile" onClick={() => setIsSidebarExpanded(true)}>%</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">My Percentile Score</label>
                      <input type="number" step="any" min="0" max="100" required value={percentile} onChange={(e) => setPercentile(e.target.value)} placeholder="e.g. 95.84" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm transition-colors" />
                    </div>
                  )}
                </div>
 
                {/* 2. Min Percentile Field */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-cyan-400 shadow cursor-pointer" title="Min Percentile Limit" onClick={() => setIsSidebarExpanded(true)}><ArrowDownNarrowWide className="h-4 w-4" /></div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><ArrowDownNarrowWide className="h-3.5 w-3.5 text-cyan-400" /> Show Options Down To</label>
                      <select value={minPercentile} onChange={(e) => setMinPercentile(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors">
                        <option value="0">0% Percentile (Show All)</option><option value="40">40% Percentile Limit</option><option value="60">60% Percentile Limit</option><option value="75">75% Percentile Limit</option><option value="85">85% Percentile Limit</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 3. Category Reservation */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-purple-400 font-bold text-xs cursor-pointer" title="Category" onClick={() => setIsSidebarExpanded(true)}>{category.substring(0,3)}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Category Reservation</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors">
                        <option value="OPEN">OPEN / General</option><option value="OBC">OBC</option><option value="SC">SC</option><option value="ST">ST</option><option value="EWS">EWS</option><option value="TFWS">TFWS</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 4. Gender Mode */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-pink-400 font-bold text-xs cursor-pointer" title="Gender" onClick={() => setIsSidebarExpanded(true)}>{gender[0]}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Gender Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Male", "Female"].map((g) => (
                          <button key={g} type="button" onClick={() => setGender(g)} className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${gender === g ? "bg-indigo-600 border-indigo-500 text-white shadow-md" : "bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200"}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
 
                {/* 5. Counseling CAP Round */}
                <div className="w-full flex flex-col items-center">
                  {!isSidebarExpanded ? (
                    <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-amber-400 font-mono text-xs font-bold cursor-pointer" title="CAP Round" onClick={() => setIsSidebarExpanded(true)}>{capRound === "All Rounds" ? "ALL" : `R${capRound.split(" ")[1]}`}</div>
                  ) : (
                    <div className="w-full">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Counseling CAP Round</label>
                      <select value={capRound} onChange={(e) => setCapRound(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors">
                        <option value="All Rounds">All CAP Rounds</option><option value="Round 1">CAP Round 1</option><option value="Round 2">CAP Round 2</option><option value="Round 3">CAP Round 3</option><option value="Round 4">CAP Round 4</option>
                      </select>
                    </div>
                  )}
                </div>
 
                {/* 6. Submit Button */}
                <div className="w-full pt-2">
                  <button type="submit" disabled={loading} className={`bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-wider ${isSidebarExpanded ? 'w-full py-3 px-4 gap-2' : 'h-10 w-10 mx-auto'}`}>
                    <Search className="h-4 w-4 shrink-0" />
                    {isSidebarExpanded && (loading ? "Querying..." : "Predict Options")}
                  </button>
                </div>
              </form>
            </aside>
            {/* RESULTS RIGHT PANEL */}
            <main ref={rightPanelRef} className="flex-1 h-full flex flex-col bg-slate-950 min-w-0 overflow-y-auto custom-scrollbar relative">
              {/* ✅ UPDATED: Dynamic search bar with local/server synchronization */}
              <header className="sticky top-0 z-20 px-8 py-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md flex justify-between items-center gap-4 shrink-0 relative">
                <div className="flex items-center gap-4 w-full max-w-md">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder={percentile ? "Search for branches (e.g., Computer Engineering, Computer Science, etc.)" : "Manual search by college name or college code"}
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-24 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={() => {
                        handleResetAll();
                      }}
                      className="absolute right-12 top-1 bottom-1 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition-colors border border-slate-700"
                    >
                      ALL
                    </button>
                    <button 
                      onClick={() => {
                        handleSearchSubmit(branchSearch);
                        setShowRecent(false);
                      }}
                      className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition-colors"
                    >
                      GO
                    </button>
                    
                    {/* RECENT SEARCHES DROPDOWN */}
                    {showRecent && (percentile ? recentBranchSearches : recentCollegeSearches).length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/50">
                          Recent {percentile ? "Branch" : "College"} Searches
                        </div>
                        {(percentile ? recentBranchSearches : recentCollegeSearches).map((recent, idx) => (
                          <div 
                            key={idx}
                            className="px-3 py-2 text-xs text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 cursor-pointer flex items-center gap-2"
                            onClick={() => {
                              setBranchSearch(recent);
                              handleSearchSubmit(recent);
                              setShowRecent(false);
                            }}
                          >
                            <Search className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{recent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md font-semibold text-indigo-400 whitespace-nowrap">
                  Total Matches: {totalCount} Colleges
                </div>
                {/* Subtle Animated Loading Bar */}
                {loading && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 animate-[pulse_1s_infinite] z-30" />
                )}
              </header>
 
              <div className={`flex-1 p-6 min-h-0 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                {!hasPredicted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-20">
                    <GraduationCap className="h-12 w-12 text-slate-700 mb-3 stroke-[1.5]" />
                    <h3 className="text-sm font-bold text-slate-400">No Target Data Loaded</h3>
                    <p className="text-xs text-slate-500 mt-1">Search for a college above, or configure parameters on the left sidebar to predict your options.</p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto py-20">
                    <Search className="h-10 w-10 text-red-500/80 mb-3 stroke-[1.5]" />
                    <h3 className="text-sm font-bold text-slate-400">No colleges found with the provided credentials.</h3>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your percentile or search query to find matching options.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
                      {filteredResults.map((item, index) => (
                        <div key={`${item.choice_code}-${index}`} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all flex flex-col justify-between shadow-md">
                          <div>
                            <div className="flex justify-between items-center gap-2 mb-3">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">Code: {item.college_code}</span>
                              <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="text-[9px] bg-fuchsia-500/10 text-fuchsia-400 px-2 py-0.5 rounded font-bold border border-fuchsia-500/20 whitespace-nowrap">CAP {item.cap_round}</span>
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20 whitespace-nowrap">{item.seat_type}</span>
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-500/20 whitespace-nowrap">{item.stage}</span>
                              </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2 mb-1">{item.college_name}</h4>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-3"><MapPin className="h-3 w-3 text-slate-500 shrink-0" /> <span className="truncate">{item.home_university}</span></div>
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs">
                              <div className="truncate pr-2">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">Engineering Discipline</div>
                                <div className="font-semibold text-slate-300 truncate max-w-[200px]">{item.branch_name}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[9px] text-slate-500 font-bold uppercase">Choice Code</div>
                                <div className="font-mono text-slate-400 text-[11px]">{item.choice_code}</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400"><Award className="h-3.5 w-3.5 text-amber-500" /><span>Cutoff Rank: <strong className="text-slate-200">{item.cutoff_rank.toLocaleString()}</strong></span></div>
                            <div className="text-right"><span className="text-base font-black text-cyan-400">{item.cutoff_percentile}%</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
 
                    {/* PAGINATION PANEL */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-4 pb-8 border-t border-slate-900">
                        <button onClick={() => fetchPredictions(currentPage - 1, lastSearchedQuery)} disabled={currentPage === 1 || loading} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                        <span className="text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-300">Page {currentPage} / {totalPages}</span>
                        <button onClick={() => fetchPredictions(currentPage + 1, lastSearchedQuery)} disabled={currentPage === totalPages || loading} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"><ChevronRight className="h-4 w-4" /></button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
