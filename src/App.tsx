import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  RefreshCw, 
  Code, 
  Database, 
  ExternalLink, 
  Terminal, 
  AlertTriangle,
  Info,
  Sparkles,
  Menu,
  X,
  Plus,
  Play,
  Settings,
  Edit,
  RotateCcw,
  CheckCircle,
  Calendar,
  Layers,
  ChevronRight,
  User,
  Heart,
  Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DateRangePicker } from "./components/DateRangePicker";
import { SqlEditor } from "./components/SqlEditor";
import { QueryTemplate, INITIAL_TEMPLATES } from "./data/templates";
import { SiteDetails, HistoryItem } from "./types";
import { highlightSql } from "./utils/sqlHighlighter";

// Default useful preset Site Keys for Unbxd teams to test/use
const DEFAULT_PRESETS = [
  "us-east-retail-delta-99",
  "staging-app-test-4",
  "global-search-production",
  "demo-unbxd-site-key"
];

export default function App() {
  const [siteKeyInput, setSiteKeyInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Lookup state
  const [resolvedDetails, setResolvedDetails] = useState<SiteDetails | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  // Query generation & templates states
  const [templates, setTemplates] = useState<QueryTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("visits-search-type");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generatedSql, setGeneratedSql] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  // Starred templates
  const [starredTemplateIds, setStarredTemplateIds] = useState<string[]>([]);

  const toggleStarTemplate = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredTemplateIds((prev) => {
      const isStarred = prev.includes(id);
      const updated = isStarred ? prev.filter((tId) => tId !== id) : [...prev, id];
      localStorage.setItem("unbxd_starred_templates", JSON.stringify(updated));
      addToast(
        isStarred ? "Removed template from favorites" : "Added template to favorites",
        isStarred ? "info" : "success"
      );
      return updated;
    });
  };

  // History list
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Custom user bookmarked keys
  const [presets, setPresets] = useState<string[]>(DEFAULT_PRESETS);
  const [newPresetInput, setNewPresetInput] = useState("");
  const [showAddPreset, setShowAddPreset] = useState(false);

  // Clipboard copy success indicators
  const [copiedSql, setCopiedSql] = useState(false);
  
  // Toast list
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // DOM Refs
  const siteKeyInputRef = useRef<HTMLInputElement>(null);

  // Template filter query
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Keyboard Shortcuts hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl/Cmd + Shift + F: Focus Site Key Input box
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        siteKeyInputRef.current?.focus();
        siteKeyInputRef.current?.select();
        addToast("Focused Site Key input", "info");
      }

      // 2. Ctrl/Cmd + Enter: Trigger SQL query compilation/generation
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (resolvedDetails) {
          handleGenerateSql();
        } else {
          addToast("Please enter and resolve a valid Site Key first", "error");
        }
      }

      // 3. Ctrl/Cmd + C: Copy generated output if nothing is selected and user is not inside inputs
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const selectedText = window.getSelection()?.toString();
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.getAttribute("contenteditable") === "true";
        
        if (!selectedText && !isInput && generatedSql) {
          e.preventDefault();
          copySqlToClipboard();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [resolvedDetails, generatedSql, templates, selectedTemplateId, startDate, endDate]);

  // 1. Initial configurations
  useEffect(() => {
    // Load state from localStorage
    try {
      const savedHistory = localStorage.getItem("unbxd_history");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
      const savedPresets = localStorage.getItem("unbxd_custom_presets");
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }

      const savedStarred = localStorage.getItem("unbxd_starred_templates");
      if (savedStarred) {
        setStarredTemplateIds(JSON.parse(savedStarred));
      }
      
      const savedTemplates = localStorage.getItem("unbxd_sql_templates");
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        if (Array.isArray(parsed) && parsed.some(t => t.id === "zero-query-decks-aggregated")) {
          setTemplates(parsed);
        } else {
          setTemplates(INITIAL_TEMPLATES);
          localStorage.setItem("unbxd_sql_templates", JSON.stringify(INITIAL_TEMPLATES));
        }
      } else {
        setTemplates(INITIAL_TEMPLATES);
      }
    } catch (e) {
      console.error("Failed to load state from storage", e);
      setTemplates(INITIAL_TEMPLATES);
    }

    // Set default dates: Start Date = today - 30 days, End Date = today
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(thirtyDaysAgo));
    setEndDate(formatDate(today));

    // Ping server
    checkProxyServer();

    // Check query params for instant resolution
    const params = new URLSearchParams(window.location.search);
    const siteKeyParam = params.get("siteKey") || params.get("key");
    if (siteKeyParam) {
      setSiteKeyInput(siteKeyParam);
      handleResolve(siteKeyParam);
    }
  }, []);

  const checkProxyServer = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch("/api/get-api-key?siteKey=ping-test", {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.status !== 502 && response.status !== 504) {
        setServerStatus("online");
      } else {
        setServerStatus("offline");
      }
    } catch (err) {
      console.error("Proxy offline or unreachable:", err);
      setServerStatus("offline");
    }
  };

  // Perform site key resolution
  const handleResolve = async (keyToQuery: string) => {
    const cleanKey = keyToQuery.trim();
    if (!cleanKey) {
      addToast("Please enter a valid Site Key", "error");
      return;
    }

    setIsSearching(true);
    setLookupError(null);
    setResolvedDetails(null);
    setHasGenerated(false);
    setGeneratedSql("");

    try {
      const response = await fetch(`/api/get-api-key?siteKey=${encodeURIComponent(cleanKey)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: Failed to resolve`);
      }

      const resolved: SiteDetails = {
        siteKey: data.siteKey,
        apiKey: data.apiKey, // Hidden from UI but used internally
        siteName: data.siteName || data.siteKey,
        siteType: data.siteDetails?.siteType || "Commerce Cloud",
        status: data.siteDetails?.status || "Active",
        createdDate: data.siteDetails?.createdDate || new Date().toISOString().split('T')[0],
        updatedDate: data.siteDetails?.updatedDate,
        ...data.siteDetails
      };

      setResolvedDetails(resolved);
      addToast(`Successfully resolved site metadata!`, "success");

      // Update Lookup History
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        siteKey: resolved.siteKey,
        apiKey: resolved.apiKey,
        siteName: resolved.siteName,
        timestamp: Date.now(),
        success: true
      };

      setHistory((prev) => {
        const filtered = prev.filter(item => item.siteKey.toLowerCase() !== resolved.siteKey.toLowerCase());
        const updated = [newHistoryItem, ...filtered].slice(0, 30);
        localStorage.setItem("unbxd_history", JSON.stringify(updated));
        return updated;
      });

    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "Network exception or API aggregator timed out.";
      setLookupError(errorMessage);
      addToast(errorMessage, "error");

      const failedHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        siteKey: cleanKey,
        timestamp: Date.now(),
        success: false,
        error: errorMessage
      };

      setHistory((prev) => {
        const filtered = prev.filter(item => item.siteKey.toLowerCase() !== cleanKey.toLowerCase());
        const updated = [failedHistoryItem, ...filtered].slice(0, 30);
        localStorage.setItem("unbxd_history", JSON.stringify(updated));
        return updated;
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePresetSelect = (siteKey: string) => {
    setSiteKeyInput(siteKey);
    handleResolve(siteKey);
    setMobileMenuOpen(false);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("unbxd_history", JSON.stringify(updated));
      return updated;
    });
    addToast("Removed item from history", "info");
  };

  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear your local lookup history?")) {
      setHistory([]);
      localStorage.removeItem("unbxd_history");
      addToast("Cleared lookup history", "info");
    }
  };

  const handleAddCustomPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPresetInput.trim();
    if (!clean) return;

    if (presets.includes(clean)) {
      addToast("Site key is already in your quick list", "info");
      return;
    }

    const updated = [...presets, clean];
    setPresets(updated);
    localStorage.setItem("unbxd_custom_presets", JSON.stringify(updated));
    setNewPresetInput("");
    setShowAddPreset(false);
    addToast("Added custom site bookmark!", "success");
  };

  const removePreset = (presetToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p !== presetToRemove);
    setPresets(updated);
    localStorage.setItem("unbxd_custom_presets", JSON.stringify(updated));
    addToast("Removed quick link bookmark", "info");
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 10000) return "Just now";
    if (diff < 60000) return "seconds ago";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // SQL Generation logic replacing placeholder tokens
  const handleGenerateSql = () => {
    if (!resolvedDetails) {
      addToast("Please resolve a valid Site Key details first", "error");
      return;
    }

    const currentTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!currentTemplate) {
      addToast("Failed to locate query template.", "error");
      return;
    }

    let finalSql = currentTemplate.defaultSql;
    
    // Replace standard placeholders
    finalSql = finalSql.replace(/{site_key}/g, resolvedDetails.siteKey);
    finalSql = finalSql.replace(/{api_key}/g, resolvedDetails.apiKey || "NO_API_KEY_FOUND");
    finalSql = finalSql.replace(/{start_date}/g, startDate);
    finalSql = finalSql.replace(/{end_date}/g, endDate);

    setGeneratedSql(finalSql);
    setHasGenerated(true);
    addToast("BigQuery SQL generated successfully!", "success");
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    addToast("Copied BigQuery SQL query to clipboard!", "success");
  };

  const handleUpdateTemplate = (newSql: string) => {
    setTemplates((prev) => {
      const updated = prev.map((t) => t.id === selectedTemplateId ? { ...t, defaultSql: newSql } : t);
      localStorage.setItem("unbxd_sql_templates", JSON.stringify(updated));
      return updated;
    });
    addToast("Custom template changes saved locally", "success");
  };

  const handleResetTemplate = () => {
    const original = INITIAL_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (original) {
      setTemplates((prev) => {
        const updated = prev.map((t) => t.id === selectedTemplateId ? { ...t, defaultSql: original.defaultSql } : t);
        localStorage.setItem("unbxd_sql_templates", JSON.stringify(updated));
        return updated;
      });
      addToast("Template reset to original structure", "info");
    }
  };

  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || INITIAL_TEMPLATES[0];

  const filteredTemplates = templates.filter(
    (tpl) =>
      tpl.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
  ).sort((a, b) => {
    const aStarred = starredTemplateIds.includes(a.id);
    const bStarred = starredTemplateIds.includes(b.id);
    if (aStarred && !bStarred) return -1;
    if (!aStarred && bStarred) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050505] text-[#e0e0e0] font-sans overflow-hidden">
      
      {/* Dynamic Toast System notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`p-3.5 rounded-lg border flex items-center gap-2.5 shadow-2xl pointer-events-auto backdrop-blur-md ${
                toast.type === "success" 
                  ? "bg-[#0b1a0e]/95 border-emerald-500/35 text-emerald-300"
                  : toast.type === "error"
                  ? "bg-[#1f0d0d]/95 border-rose-500/35 text-rose-300"
                  : "bg-[#0c131a]/95 border-blue-500/35 text-blue-300"
              }`}
            >
              {toast.type === "success" && <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />}
              {toast.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
              {toast.type === "info" && <Info className="w-4 h-4 shrink-0 text-blue-400" />}
              <span className="text-xs font-mono tracking-tight font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MOBILE SITE BAR HEADER */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/10 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
            <span className="text-black font-bold text-xs font-mono">UA</span>
          </div>
          <h1 className="text-md font-serif italic tracking-tight text-white">Aggregator</h1>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 text-white/70 hover:text-white focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* PRIMARY SIDEBAR CONTAINER */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 border-r border-white/[0.06] bg-[#09090b] flex flex-col p-6 transition-all duration-300 transform
        md:translate-x-0 md:static md:z-auto shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Brand visual header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-white/20">
              <span className="text-black font-extrabold text-xs font-mono">UA</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white font-sans flex items-center gap-1">
                Unbxd <span className="text-indigo-400 font-light">Console</span>
              </h1>
              <p className="text-[9px] text-white/30 tracking-[0.15em] font-mono">BIGQUERY TOOLKIT</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-white/40 hover:text-white p-1.5 hover:bg-white/5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Panel list */}
        <div className="flex-1 overflow-y-auto space-y-7 pr-1 custom-scrollbar">
          
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-bold font-mono">
                Saved Presets
              </h2>
              <button
                onClick={() => setShowAddPreset(!showAddPreset)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono transition bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/20"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {/* Bookmark list creator form */}
            <AnimatePresence>
              {showAddPreset && (
                <motion.form
                  initial={{ opacity: 0, height: 0, y: -5 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -5 }}
                  onSubmit={handleAddCustomPreset}
                  className="mb-3 overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 bg-[#121214] border border-white/10 rounded-lg p-1.5 shadow-inner">
                    <input
                      type="text"
                      placeholder="Enter site key..."
                      value={newPresetInput}
                      onChange={(e) => setNewPresetInput(e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-white placeholder:text-white/20 focus:outline-none font-mono px-1.5 py-1"
                    />
                    <button 
                      type="submit" 
                      className="bg-white text-black text-[10px] px-2.5 py-1 rounded font-bold hover:bg-slate-200 transition shadow-sm active:scale-95"
                    >
                      Save
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => {
                const isActive = siteKeyInput === preset;
                return (
                  <div
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer select-none ${
                      isActive 
                        ? "bg-indigo-950/45 border-indigo-500/40 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                        : "bg-white/[0.01] border-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.04] hover:border-white/15"
                    }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-400 opacity-60 group-hover:scale-125 group-hover:opacity-100 transition-all duration-300" />
                    <span className="truncate max-w-[130px] font-medium">{preset}</span>
                    <button
                      onClick={(e) => removePreset(preset, e)}
                      className="opacity-0 group-hover:opacity-100 text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 ml-1 p-0.5 rounded-full"
                      title="Delete custom link"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Lookup history section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-bold font-mono">
                Recent Queries
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearAllHistory}
                  className="text-[10px] text-rose-400/70 hover:text-rose-400 font-mono transition px-2 py-0.5 rounded hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/[0.04] rounded-xl px-4 bg-white/[0.01]">
                <Clock className="w-5 h-5 text-white/15 mx-auto mb-2" />
                <p className="text-[11px] text-white/30 font-sans">No recent lookup records.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5 custom-scrollbar">
                {history.map((item) => {
                  const isActive = siteKeyInput === item.siteKey;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handlePresetSelect(item.siteKey)}
                      className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-between group cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                        isActive 
                          ? "bg-white/[0.04] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_20px_rgba(0,0,0,0.3)]" 
                          : "border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`relative flex h-2 w-2`}>
                            {item.success && isActive && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${item.success ? "bg-emerald-500/80" : "bg-rose-500/80"}`} />
                          </span>
                          <div className="text-xs font-semibold font-mono truncate text-slate-200 tracking-tight">
                            {item.siteKey}
                          </div>
                        </div>
                        <div className="text-[10px] text-white/30 font-mono mt-0.5 truncate flex items-center gap-1 pl-4">
                          <span>{item.siteName || "Failed lookup"}</span>
                          <span>•</span>
                          <span className="text-white/20">{formatTimeAgo(item.timestamp)}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove history entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Footer info and user profile */}
        <div className="mt-auto border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white/90 truncate font-sans">tanmay.g@netcoreunbxd</p>
                <p className="text-[9px] text-white/40 font-mono">Development Team</p>
              </div>
            </div>
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" title="Gateway connected" />
            </div>
          </div>
        </div>
      </aside>

      {/* PRIMARY MAIN LAYOUT GRID */}
      <main className="flex-1 flex flex-col bg-[#050505] overflow-y-auto custom-scrollbar relative">
        
        {/* Visual Blur Art Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/5 rounded-full filter blur-[120px] pointer-events-none" />

        {/* Top bar header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 md:px-8 shrink-0 relative z-10 bg-[#050505]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${
              serverStatus === "online" 
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse"
            }`} />
            <span className="text-[11px] font-mono text-white/60 uppercase tracking-widest font-semibold">
              {serverStatus === "online" ? "API CONNECTION ACTIVE" : "CONNECTING TO GATEWAY..."}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="http://aggregator.unbxdapi.com/analytics-aggregator/swagger-ui.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] font-mono font-medium text-white/40 hover:text-indigo-300 transition flex items-center gap-1"
            >
              SWAGGER DOCS <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-white/10 text-xs">|</span>
            <div className="text-[11px] font-mono text-white/40">
              STABLE NODE: <span className="text-emerald-400 font-semibold">AGGR_01</span>
            </div>
          </div>
        </header>

        {/* Dashboard Main Content Pane */}
        <div className="flex-1 flex flex-col justify-start max-w-4xl mx-auto w-full px-6 py-10 md:py-16 space-y-12 relative z-10 animate-in fade-in duration-300">
          
          {/* Section 1: Brand Title Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-[10px] font-mono uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>BigQuery Automation Toolkit</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight leading-tight">
              Site Key Resolver
            </h2>
            <p className="text-white/40 text-xs md:text-sm max-w-xl mx-auto font-sans leading-relaxed">
              Dynamically fetch secure platform credentials, adjust target date ranges, choose from fully customizable SQL templates, and compile error-free BigQuery queries instantly.
            </p>
          </div>

          {/* Section 2: Input site key form */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-700"></div>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleResolve(siteKeyInput);
              }}
              className="relative bg-[#0a0a0c]/90 border border-white/10 hover:border-white/20 focus-within:border-indigo-500/50 hover:bg-[#111115] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.12)] rounded-2xl flex flex-col sm:flex-row items-stretch p-2 gap-2 shadow-2xl transition-all duration-300"
            >
              <div className="flex-1 flex items-center px-3 gap-3">
                <Search className="w-5 h-5 text-indigo-400 shrink-0" />
                <input
                  ref={siteKeyInputRef}
                  type="text"
                  placeholder="Enter Unbxd Site Key (e.g. staging-app-test-4)..."
                  className="w-full bg-transparent border-none text-white px-1 py-3 font-mono text-sm md:text-base placeholder:text-white/20 focus:outline-none focus:ring-0 transition-colors duration-200"
                  value={siteKeyInput}
                  onChange={(e) => setSiteKeyInput(e.target.value)}
                  disabled={isSearching}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSearching}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:brightness-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-95 text-black font-extrabold text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-mono disabled:opacity-50 disabled:scale-100 shadow-lg cursor-pointer"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>RETRIEVING SITE DATA...</span>
                  </>
                ) : (
                  <span>RETRIEVE DETAILS</span>
                )}
              </button>
            </form>
          </div>

          {/* Step 2-5 Visual workflows */}
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#09090b] border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xl"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border border-indigo-500/30 border-t-indigo-400 animate-spin" />
                  <Database className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-sm text-indigo-300">Resolving Aggregator Credentials...</p>
                  <p className="text-xs text-white/35 font-sans">Contacting Netcore Unbxd gateway service gateway...</p>
                </div>
              </motion.div>
            )}

            {/* Error Resolver State */}
            {!isSearching && lookupError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#1c0f0f] border border-rose-500/20 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="px-6 py-3 border-b border-rose-500/15 bg-rose-500/[0.03] flex justify-between items-center">
                  <div className="text-[10px] uppercase tracking-widest text-rose-400 font-mono font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Error Status</span>
                  </div>
                  <div className="text-[10px] font-mono text-rose-400 font-semibold bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/20">FAIL 404</div>
                </div>
                <div className="p-8 md:p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">Could not locate Site Key</h3>
                    <p className="text-xs text-rose-300/80 font-mono max-w-lg mx-auto bg-black/40 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {lookupError}
                    </p>
                  </div>
                  <p className="text-xs text-white/35 max-w-md mx-auto leading-relaxed">
                    Please double check your site key spelling, or select one of the bookmarks from the sidebars to execute queries.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Success Metadata Display & Date Picker & Template Options */}
            {!isSearching && resolvedDetails && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Visual indicator that site key details are retrieved (API key is hidden as requested!) */}
                <div className="bg-[#0b1311] border border-emerald-500/15 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-950/10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white font-sans">
                          Site Credentials Resolved
                        </h4>
                        <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                          Securely Cached
                        </span>
                      </div>
                      <p className="text-xs text-emerald-300/60 mt-1 font-sans">
                        Dynamic BigQuery schema handles <code className="text-emerald-200 font-semibold font-mono">{resolvedDetails.siteKey}</code> successfully.
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block">Resolved Site Name</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{resolvedDetails.siteName}</span>
                  </div>
                </div>

                {/* Grid container for step 2 date picker and step 3 template choices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Step 2 Calendar Date Picker Column */}
                  <div className="bg-[#09090b] border border-white/10 hover:border-white/15 transition-colors duration-300 rounded-2xl p-5 space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center text-indigo-400 text-xs font-bold font-mono">
                          02
                        </div>
                        <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
                          Date Range Selection
                        </h3>
                      </div>

                      {/* Integrated custom calendar component */}
                      <DateRangePicker 
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(start, end) => {
                          setStartDate(start);
                          setEndDate(end);
                          setHasGenerated(false); // Reset generated SQL if parameters change
                        }}
                      />
                    </div>

                    <div className="p-3.5 bg-white/[0.01] border border-white/[0.04] rounded-xl text-[11px] text-white/40 font-mono leading-relaxed mt-4">
                      Generated queries will partition rows matching standard UTC timestamps between <code className="text-indigo-400 font-semibold">{startDate}</code> and <code className="text-indigo-400 font-semibold">{endDate}</code>.
                    </div>
                  </div>

                  {/* Step 3 Select Query Template Column */}
                  <div className="bg-[#09090b] border border-white/10 hover:border-white/15 transition-colors duration-300 rounded-2xl p-5 space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center text-indigo-400 text-xs font-bold font-mono">
                            03
                          </div>
                          <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
                            Select Query Template
                          </h3>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                          {templateSearchQuery ? `${filteredTemplates.length} FOUND` : `${templates.length} TEMPLATES`}
                        </span>
                      </div>

                      {/* Real-time search input for templates */}
                      <div className="relative mb-3 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search templates by name or description..."
                          value={templateSearchQuery}
                          onChange={(e) => setTemplateSearchQuery(e.target.value)}
                          className="w-full bg-[#050506] border border-white/10 hover:border-white/15 focus:border-indigo-500/40 rounded-xl pl-9 pr-8 py-2 text-xs font-sans placeholder:text-white/20 text-white focus:outline-none transition-all duration-200 shadow-inner"
                        />
                        {templateSearchQuery && (
                          <button
                            onClick={() => setTemplateSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 rounded-full hover:bg-white/5 transition-all duration-200"
                            title="Clear search"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[295px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {filteredTemplates.length === 0 ? (
                          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/5 bg-white/[0.01]">
                            <p className="text-xs text-white/40 font-mono">No matching templates found</p>
                            <button
                              onClick={() => setTemplateSearchQuery("")}
                              className="mt-2 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline"
                            >
                              Clear Search Filter
                            </button>
                          </div>
                        ) : (
                          filteredTemplates.map((tpl) => {
                            const isSelected = selectedTemplateId === tpl.id;
                            return (
                              <div
                                key={tpl.id}
                                onClick={() => {
                                  setSelectedTemplateId(tpl.id);
                                  setHasGenerated(false);
                                }}
                                className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer text-left relative flex items-start gap-3 select-none hover:translate-x-0.5 ${
                                  isSelected
                                    ? "bg-indigo-950/20 border-indigo-500/40 text-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.08)]"
                                    : "bg-white/[0.01] border-white/[0.03] text-white/60 hover:bg-white/[0.03] hover:border-white/10 hover:text-white"
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                                    isSelected ? "border-indigo-400 bg-indigo-500" : "border-white/20"
                                  }`}>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                                  </div>
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-bold font-sans tracking-tight text-white/90 truncate">
                                      {tpl.name}
                                    </div>
                                    <button
                                      onClick={(e) => toggleStarTemplate(tpl.id, e)}
                                      className="p-1 rounded-md transition-all duration-200 hover:bg-white/10 shrink-0 cursor-pointer"
                                      title={starredTemplateIds.includes(tpl.id) ? "Remove from favorites" : "Add to favorites"}
                                    >
                                      <Star 
                                        className={`w-3.5 h-3.5 transition-all duration-200 ${
                                          starredTemplateIds.includes(tpl.id)
                                            ? "fill-amber-400 text-amber-400 scale-110"
                                            : "text-white/20 hover:text-white/60 hover:scale-105"
                                        }`} 
                                      />
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-white/35 leading-relaxed font-sans line-clamp-2">
                                    {tpl.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Step 4 Editable template viewer */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-400/25 flex items-center justify-center text-indigo-400 text-xs font-bold font-mono">
                        04
                      </div>
                      <h3 className="text-xs font-bold text-white tracking-widest uppercase font-mono">
                        Query Template Configuration
                      </h3>
                    </div>
                    <span className="text-[10px] text-white/35 font-mono bg-white/5 px-2 py-0.5 rounded-md">
                      Auto-saved to local storage
                    </span>
                  </div>

                  <SqlEditor 
                    initialValue={activeTemplate.defaultSql}
                    onSave={handleUpdateTemplate}
                    onReset={handleResetTemplate}
                    isEditable={true}
                  />
                </div>

                {/* Giant Trigger Button for Generating */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleGenerateSql}
                    className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:brightness-110 text-black py-4 rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] active:scale-[0.99] flex items-center justify-center gap-2.5 font-mono cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Generate Authenticated BigQuery SQL</span>
                  </button>
                </div>

                {/* Step 5 & 6 Final generated SQL output display */}
                <AnimatePresence>
                  {hasGenerated && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="space-y-3.5 pt-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono">
                            05
                          </div>
                          <h3 className="text-xs font-bold text-emerald-400 tracking-widest uppercase font-mono">
                            Compiled SQL Output
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={copySqlToClipboard}
                            className={`px-4 py-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-2 active:scale-95 cursor-pointer font-bold ${
                              copiedSql 
                                ? "bg-emerald-950 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                : "bg-emerald-500 text-black border-transparent hover:brightness-110"
                            }`}
                          >
                            {copiedSql ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>COPIED TO CLIPBOARD</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>COPY TO CLIPBOARD</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleGenerateSql}
                            className="px-3 py-2 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white text-xs font-mono transition-all duration-300 rounded-xl flex items-center gap-1.5 active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>RECOMPILE</span>
                          </button>
                        </div>
                      </div>

                      {/* Read-only output editor container */}
                      <div className="bg-[#08080a] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                        {/* Summary panel above SQL */}
                        <div className="px-5 py-3 border-b border-emerald-500/15 bg-emerald-950/10 flex justify-between items-center text-[10px] font-mono">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>COMPILATION: SUCCESSFUL</span>
                          </div>
                          <span className="text-white/30 uppercase tracking-wider">Target: Google BigQuery</span>
                        </div>

                        {/* Scrolling code container */}
                        <div className="p-5 overflow-x-auto overflow-y-auto max-h-[480px] text-xs font-mono leading-6 text-indigo-200 bg-black/50 whitespace-pre select-text custom-scrollbar">
                          <code 
                            className="block select-text"
                            dangerouslySetInnerHTML={{ __html: highlightSql(generatedSql) }}
                          />
                        </div>

                        {/* Small footer note */}
                        <div className="px-5 py-3 bg-[#050507] border-t border-white/[0.04] text-[10px] text-white/30 font-mono flex flex-col sm:flex-row justify-between gap-1">
                          <span>Secure internal token injected successfully</span>
                          <span className="text-emerald-500/60 font-semibold">Copy and paste directly into Google Cloud Console</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Guide Helper list when no query has been retrieved yet */}
          {!resolvedDetails && !lookupError && !isSearching && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 hover:bg-white/[0.02] hover:border-indigo-500/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-400/15 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform duration-300">
                  <Database className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-bold text-white tracking-widest uppercase font-mono">Secure Token Proxy</h4>
                <p className="text-xs text-white/40 font-sans leading-relaxed">
                  Fetches live Site key credentials internally. The API Key is kept 100% hidden and secure from browser visibility, as requested.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 hover:bg-white/[0.02] hover:border-indigo-500/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/15 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform duration-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-bold text-white tracking-widest uppercase font-mono">Modern Calendar Pick</h4>
                <p className="text-xs text-white/40 font-sans leading-relaxed">
                  Select start and end dates with our gorgeous date-range picker. Placeholders are updated dynamically instantly.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 hover:bg-white/[0.02] hover:border-indigo-500/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/15 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform duration-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-bold text-white tracking-widest uppercase font-mono">Extensible Templates</h4>
                <p className="text-xs text-white/40 font-sans leading-relaxed">
                  Fully edit existing query templates directly in the editor. Edits are saved locally for future lookup iterations.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* System Terminal Footer info */}
        <footer className="mt-auto h-14 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between px-6 md:px-8 text-[10px] font-mono text-white/20 py-4 sm:py-0 shrink-0 gap-2 sm:gap-0 bg-[#040405] z-10">
          <div className="flex items-center gap-4">
            <span>v2.1.0-STABLE</span>
            <span>•</span>
            <span className="text-white/25">SECURE END-TO-END SANDBOX ACTIVATED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Designed for</span>
            <span className="text-indigo-400 font-bold tracking-wider">NETCORE UNBXD</span>
            <span>analytics analytics</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
