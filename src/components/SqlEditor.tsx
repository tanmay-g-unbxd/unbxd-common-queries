import React, { useState, useEffect, useRef } from "react";
import { highlightSql } from "../utils/sqlHighlighter";
import { Terminal, Copy, Check, Save, Edit2, Play, Eye, EyeOff, RotateCcw } from "lucide-react";

interface SqlEditorProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  onReset: () => void;
  isEditable?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  initialValue,
  onSave,
  onReset,
  isEditable = true,
}) => {
  const [code, setCode] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCode(initialValue);
  }, [initialValue]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(code);
    setIsEditing(false);
  };

  const handleReset = () => {
    onReset();
    setIsEditing(false);
    setShowResetConfirm(false);
  };

  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // Sync scroll between textarea and line numbers
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Header Bar */}
      <div className="px-5 py-3.5 border-b border-white/10 bg-[#050506] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] font-mono tracking-wider font-semibold uppercase text-white/65">
            {isEditing ? "SQL Query Template (Editing Mode)" : "SQL Query Template"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset Template */}
          {isEditing && (
            showResetConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg animate-in fade-in zoom-in-95 duration-150 shrink-0">
                <span className="text-[9px] font-mono text-rose-300 font-bold uppercase tracking-wider mr-1">Reset?</span>
                <button
                  onClick={handleReset}
                  className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-rose-500 hover:bg-rose-400 text-black rounded transition cursor-pointer"
                >
                  YES
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white/10 text-white hover:bg-white/20 rounded transition cursor-pointer"
                >
                  NO
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-2.5 py-1 text-[11px] font-mono font-medium text-white/40 hover:text-white transition-all duration-200 flex items-center gap-1 hover:bg-white/5 rounded cursor-pointer shrink-0"
                title="Reset default template structure"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )
          )}

          {/* Copy and Mode Toggle triggers */}
          {isEditable && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                isEditing
                  ? "bg-indigo-950 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white/80"
              }`}
            >
              {isEditing ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>PREVIEW</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>EDIT TEMPLATE</span>
                </>
              )}
            </button>
          )}

          {/* Action trigger to copy code block */}
          {!isEditing && (
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-white/80 hover:text-white text-xs font-mono transition-all duration-300 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex h-[380px] font-mono text-sm relative bg-[#070708]">
        {/* Line Numbers column */}
        <div 
          ref={lineNumbersRef}
          className="w-12 border-r border-white/5 select-none bg-[#040405] text-white/20 text-right py-4 pr-3 overflow-hidden text-xs leading-6"
        >
          {lineNumbers.map((ln) => (
            <div key={`line-${ln}`}>{ln}</div>
          ))}
        </div>

        {/* Text Area or Highlighted View wrapper */}
        <div className="flex-1 relative overflow-hidden h-full">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              className="w-full h-full bg-transparent border-none text-slate-100 p-4 font-mono text-xs focus:ring-0 focus:outline-none resize-none leading-6 overflow-y-auto whitespace-pre custom-scrollbar"
              placeholder="SELECT ... FROM ... WHERE site_name = '{site_key}'"
              spellCheck="false"
            />
          ) : (
            <div className="w-full h-full p-4 overflow-y-auto overflow-x-auto whitespace-pre leading-6 text-xs text-indigo-200 select-text custom-scrollbar bg-[#050506]/35">
              <code 
                className="block select-text"
                dangerouslySetInnerHTML={{ __html: highlightSql(code) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Saving and Action Bar at Bottom of Editor (Only in edit mode) */}
      {isEditing && (
        <div className="px-5 py-3 border-t border-white/10 bg-[#050506] flex items-center justify-between">
          <div className="text-[10px] text-white/30 font-mono">
            Placeholders: <code className="text-amber-400 font-bold">{"{site_key}"}</code>, <code className="text-amber-400 font-bold">{"{api_key}"}</code>, <code className="text-amber-400 font-bold">{"{start_date}"}</code>, <code className="text-amber-400 font-bold">{"{end_date}"}</code>
          </div>
          <button
            onClick={handleSave}
            className="bg-indigo-500 hover:bg-indigo-400 text-black px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-300 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(99,102,241,0.2)] active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE CHANGES</span>
          </button>
        </div>
      )}
    </div>
  );
};
