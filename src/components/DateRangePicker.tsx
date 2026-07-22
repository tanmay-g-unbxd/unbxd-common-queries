import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelectingFirst, setIsSelectingFirst] = useState(true);

  // Manual input states
  const [typedStartDate, setTypedStartDate] = useState(startDate);
  const [typedEndDate, setTypedEndDate] = useState(endDate);
  const [inputError, setInputError] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync prop changes back to manual input states
  useEffect(() => {
    setTypedStartDate(startDate);
    setTypedEndDate(endDate);
    setInputError("");
  }, [startDate, endDate]);

  // Validation helper
  const isValidDate = (str: string): boolean => {
    const reg = /^\d{4}-\d{2}-\d{2}$/;
    if (!reg.test(str)) return false;
    const parts = str.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d);
    return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
  };

  const handleTypedStartChange = (val: string) => {
    setTypedStartDate(val);
    if (isValidDate(val)) {
      const d = parseDateString(val);
      setCurrentMonth(d); // Align calendar month to the typed date
      setInputError("");
      
      if (isValidDate(typedEndDate)) {
        const dEnd = parseDateString(typedEndDate);
        if (d.getTime() <= dEnd.getTime()) {
          onChange(val, typedEndDate);
        } else {
          onChange(val, val); // Set end to match if start is after end
        }
      } else {
        onChange(val, val);
      }
    } else {
      setInputError("Format must be YYYY-MM-DD (e.g. 2025-12-31)");
    }
  };

  const handleTypedEndChange = (val: string) => {
    setTypedEndDate(val);
    if (isValidDate(val)) {
      const d = parseDateString(val);
      setInputError("");
      
      if (isValidDate(typedStartDate)) {
        const dStart = parseDateString(typedStartDate);
        if (dStart.getTime() <= d.getTime()) {
          onChange(typedStartDate, val);
        } else {
          setInputError("End date cannot be before Start date");
        }
      }
    } else {
      setInputError("Format must be YYYY-MM-DD (e.g. 2025-12-31)");
    }
  };

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
        setIsSelectingFirst(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateString = (str: string): Date => {
    const parts = str.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDay }, (_, i) => i);

  const handleDayClick = (dayNum: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    const clickedStr = formatDateString(clickedDate);
    
    if (isSelectingFirst) {
      // First click: set both start and end to the same day
      onChange(clickedStr, clickedStr);
      setIsSelectingFirst(false);
    } else {
      const clickedTime = clickedDate.getTime();
      const startTime = start.getTime();
      
      if (clickedTime < startTime) {
        // Clicked date is before current start date: update start and stay in end-date selection state
        onChange(clickedStr, clickedStr);
      } else {
        // Set end date and complete selection
        onChange(startDate, clickedStr);
        setIsSelectingFirst(true);
        setShowCalendar(false); // auto close on range finish
      }
    }
  };

  const handlePreset = (days: number) => {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - days);
    
    onChange(formatDateString(startD), formatDateString(endD));
    setIsSelectingFirst(true);
    setShowCalendar(false);
  };

  const handleThisMonthPreset = () => {
    const today = new Date();
    const startD = new Date(today.getFullYear(), today.getMonth(), 1);
    onChange(formatDateString(startD), formatDateString(today));
    setIsSelectingFirst(true);
    setShowCalendar(false);
  };

  const handleLastMonthPreset = () => {
    const today = new Date();
    const startD = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endD = new Date(today.getFullYear(), today.getMonth(), 0);
    onChange(formatDateString(startD), formatDateString(endD));
    setIsSelectingFirst(true);
    setShowCalendar(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSelected = (dayNum: number): boolean => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  };

  const isStart = (dayNum: number): boolean => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    return d.toDateString() === start.toDateString();
  };

  const isEnd = (dayNum: number): boolean => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    return d.toDateString() === end.toDateString();
  };

  const isBetween = (dayNum: number): boolean => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    const time = d.getTime();
    
    if (startDate !== endDate) {
      return time > start.getTime() && time < end.getTime();
    }
    
    if (hoverDate && time > start.getTime() && time <= hoverDate.getTime()) {
      return true;
    }
    
    return false;
  };

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[11px] font-mono tracking-wider text-white/45 uppercase mb-2 font-medium">
        Target Partition Date Range
      </label>
      
      {/* Visual Input Selector trigger */}
      <div 
        onClick={() => {
          setShowCalendar(!showCalendar);
          setIsSelectingFirst(true);
        }}
        className="w-full bg-[#0a0a0c] border border-white/10 hover:border-indigo-500/40 hover:bg-[#111115] hover:shadow-[0_0_20px_rgba(99,102,241,0.04)] transition-all duration-300 rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer group shadow-inner"
      >
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-indigo-400 group-hover:scale-105 transition duration-300" />
          <div className="font-mono text-xs md:text-sm tracking-tight text-white flex items-center gap-2">
            <span className="font-bold">{startDate}</span>
            <span className="text-white/20 font-normal">to</span>
            <span className="font-bold">{endDate}</span>
          </div>
        </div>
        
        <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider uppercase group-hover:text-indigo-300 transition-colors duration-200">
          SELECT RANGE
        </span>
      </div>

      {/* Modern Dropdown Popover */}
      {showCalendar && (
        <div className="absolute right-0 left-0 sm:left-auto sm:w-[480px] mt-2 bg-[#09090b] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-40 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Quick presets list on left/top */}
          <div className="w-full md:w-36 p-4 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible shrink-0 bg-[#050506]">
            <span className="hidden md:block text-[9px] font-mono uppercase text-white/30 tracking-wider mb-2 px-1">Presets</span>
            <button
              onClick={() => handlePreset(0)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 text-white/70 hover:text-indigo-300 md:hover:translate-x-1 text-left text-xs font-mono transition-all duration-200 cursor-pointer shrink-0"
            >
              Today
            </button>
            <button
              onClick={() => handlePreset(7)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 text-white/70 hover:text-indigo-300 md:hover:translate-x-1 text-left text-xs font-mono transition-all duration-200 cursor-pointer shrink-0"
            >
              7 Days
            </button>
            <button
              onClick={() => handlePreset(30)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 text-white/70 hover:text-indigo-300 md:hover:translate-x-1 text-left text-xs font-mono transition-all duration-200 cursor-pointer shrink-0"
            >
              30 Days
            </button>
            <button
              onClick={() => handleThisMonthPreset()}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 text-white/70 hover:text-indigo-300 md:hover:translate-x-1 text-left text-xs font-mono transition-all duration-200 cursor-pointer shrink-0"
            >
              This Month
            </button>
            <button
              onClick={() => handleLastMonthPreset()}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/10 text-white/70 hover:text-indigo-300 md:hover:translate-x-1 text-left text-xs font-mono transition-all duration-200 cursor-pointer shrink-0"
            >
              Last Month
            </button>
          </div>

          {/* Calendar Grid Section */}
          <div className="flex-1 p-5 bg-[#09090b]">
            
            {/* Quick Manual Entry Section */}
            <div className="mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-white/40 tracking-wider font-bold">Manual Entry (Type Date)</span>
                {inputError && (
                  <span className="text-[9px] font-mono text-rose-400 font-bold animate-pulse">
                    {inputError}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-white/30 font-bold uppercase">START</span>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={typedStartDate}
                    onChange={(e) => handleTypedStartChange(e.target.value)}
                    className="w-full bg-[#050506] border border-white/10 hover:border-white/15 focus:border-indigo-500/40 rounded-lg pl-10 pr-2 py-1.5 text-[11px] font-mono text-white placeholder:text-white/10 focus:outline-none transition-all"
                  />
                </div>
                <span className="text-white/20 font-mono text-xs shrink-0">→</span>
                <div className="flex-1 relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-mono text-white/30 font-bold uppercase">END</span>
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={typedEndDate}
                    onChange={(e) => handleTypedEndChange(e.target.value)}
                    className="w-full bg-[#050506] border border-white/10 hover:border-white/15 focus:border-indigo-500/40 rounded-lg pl-9 pr-2 py-1.5 text-[11px] font-mono text-white placeholder:text-white/10 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Header controls with interactive Month/Year Selectors */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded-md border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1.5 font-mono">
                {/* Month Dropdown Selector */}
                <select
                  value={currentMonth.getMonth()}
                  onChange={(e) => {
                    const newMonth = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(currentMonth.getFullYear(), newMonth, 1));
                  }}
                  className="bg-[#050506] border border-white/10 text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500/40 cursor-pointer hover:bg-white/5 transition-all uppercase tracking-wide"
                >
                  {monthsList.map((m, idx) => (
                    <option key={m} value={idx} className="bg-[#09090b] text-white">
                      {m}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown Selector */}
                <select
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const newYear = parseInt(e.target.value, 10);
                    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1));
                  }}
                  className="bg-[#050506] border border-white/10 text-white text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500/40 cursor-pointer hover:bg-white/5 transition-all tracking-wide"
                >
                  {(() => {
                    const currentYearVal = new Date().getFullYear();
                    const years = [];
                    // Provide range of years: -10 to +3
                    for (let y = currentYearVal - 10; y <= currentYearVal + 3; y++) {
                      years.push(y);
                    }
                    return years.map((y) => (
                      <option key={y} value={y} className="bg-[#09090b] text-white">
                        {y}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <button 
                onClick={handleNextMonth}
                className="p-1 rounded-md border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((wd) => (
                <div key={wd} className="text-[10px] font-mono font-bold text-white/30 uppercase py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding empty spaces */}
              {blankDays.map((blank) => (
                <div key={`blank-${blank}`} className="py-1.5" />
              ))}

              {/* Render days */}
              {daysArray.map((dayNum) => {
                const dayStart = isStart(dayNum);
                const dayEnd = isEnd(dayNum);
                const dayBetween = isBetween(dayNum);
                const daySelected = isSelected(dayNum);

                return (
                  <button
                    key={`day-${dayNum}`}
                    onMouseEnter={() => {
                      if (startDate === endDate) {
                        setHoverDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum));
                      }
                    }}
                    onMouseLeave={() => setHoverDate(null)}
                    onClick={() => handleDayClick(dayNum)}
                    className={`
                      py-1.5 text-xs font-mono rounded transition-all duration-200 text-center relative cursor-pointer
                      ${daySelected ? "text-black font-extrabold" : "text-white/80 hover:bg-indigo-500/15 hover:text-white"}
                      ${dayStart ? "bg-indigo-400 rounded-l rounded-r-none text-black font-extrabold" : ""}
                      ${dayEnd ? "bg-cyan-400 rounded-r rounded-l-none text-black font-extrabold" : ""}
                      ${dayBetween && !dayStart && !dayEnd ? "bg-indigo-500/20 text-indigo-200" : ""}
                    `}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer with active date preview */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
              <div className="text-[10px] text-white/40 font-mono font-medium">
                RANGE CHOSEN
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="bg-indigo-500 hover:bg-indigo-400 text-black px-4 py-1.5 rounded-lg text-[11px] font-mono font-black tracking-widest cursor-pointer transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(99,102,241,0.25)]"
              >
                APPLY
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
