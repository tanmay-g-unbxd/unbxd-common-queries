import React from "react";
import { Activity, Database, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface HeaderProps {
  totalLookups: number;
  successCount: number;
  historyCount: number;
  serverStatus: "checking" | "online" | "offline";
}

export const Header: React.FC<HeaderProps> = ({
  totalLookups,
  successCount,
  historyCount,
  serverStatus,
}) => {
  const successRate = totalLookups > 0 ? Math.round((successCount / totalLookups) * 100) : 0;

  return (
    <header className="w-full bg-white border-b border-slate-100 py-5 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-100">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-sans">
                Unbxd API Key Explorer
              </h1>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium font-sans border border-blue-100">
                v1.2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Internal Netcore Unbxd Analytics Aggregator Gateway
            </p>
          </div>
        </div>

        {/* Right metrics and state */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          
          {/* Server Status Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-xs font-mono">
            <span className="text-slate-400">PROXY:</span>
            {serverStatus === "checking" && (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                pinging...
              </span>
            )}
            {serverStatus === "online" && (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                CONNECTED
              </span>
            )}
            {serverStatus === "offline" && (
              <span className="flex items-center gap-1 text-rose-600">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                DISCONNECTED
              </span>
            )}
          </div>

          {/* Metric 1 */}
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-100 bg-white shadow-xs"
          >
            <Activity className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <span className="text-slate-400 font-sans">Lookups: </span>
              <span className="font-semibold text-slate-700 font-mono">{totalLookups}</span>
            </div>
          </motion.div>

          {/* Metric 2 */}
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-100 bg-white shadow-xs"
          >
            <Database className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <span className="text-slate-400 font-sans">Success Rate: </span>
              <span className="font-semibold text-slate-700 font-mono">{successRate}%</span>
            </div>
          </motion.div>

          {/* Metric 3 */}
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-100 bg-white shadow-xs"
          >
            <span className="text-slate-400 text-xs">Saved: </span>
            <span className="font-semibold text-slate-700 font-mono text-xs">{historyCount}</span>
          </motion.div>

        </div>
      </div>
    </header>
  );
};
