import React from "react";

// Simple and highly performant custom SQL syntax highlighter
export const highlightSql = (sql: string): string => {
  if (!sql) return "";

  // Escape HTML characters to prevent XSS
  let escaped = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight comments first
  escaped = escaped.replace(/(--.*)/g, '<span class="text-white/35 font-normal">$1</span>');

  // Highlight string literals
  escaped = escaped.replace(/('[^']*')/g, '<span class="text-emerald-400">$1</span>');
  escaped = escaped.replace(/("[^"]*")/g, '<span class="text-emerald-400">$1</span>');
  escaped = escaped.replace(/(`[^`]*`)/g, '<span class="text-slate-300 font-medium font-mono bg-white/[0.02] px-1 rounded border border-white/5">$1</span>');

  // SQL standard keywords
  const keywords = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT",
    "CASE", "WHEN", "THEN", "ELSE", "END", "AS", "AND", "OR", "NOT",
    "IN", "ON", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS",
    "TRUE", "FALSE", "NULL", "DESC", "ASC", "WITH", "UNION", "ALL", "LIKE"
  ];

  // SQL functions
  const functions = [
    "SUM", "COUNT", "DATE", "JSON_EXTRACT", "JSON_EXTRACT_SCALAR", 
    "STRING_AGG", "DISTINCT", "TIMESTAMP", "SAFE_DIVIDE", "AVERAGE",
    "MAX", "MIN", "COALESCE", "CAST"
  ];

  // Regex to match keywords (avoiding matching inside HTML tags)
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, "g");
    escaped = escaped.replace(regex, `<span class="text-indigo-400 font-semibold">$1</span>`);
  });

  // Regex to match SQL functions
  functions.forEach((fn) => {
    const regex = new RegExp(`\\b(${fn})\\b`, "g");
    escaped = escaped.replace(regex, `<span class="text-cyan-400 font-medium">$1</span>`);
  });

  // Highlight Placeholders specially
  const placeholders = [
    "{api_key}",
    "{site_key}",
    "{start_date}",
    "{end_date}"
  ];

  placeholders.forEach((ph) => {
    const cleanPh = ph.replace("{", "\\{").replace("}", "\\}");
    const regex = new RegExp(`(${cleanPh})`, "g");
    // Highlight placeholders in amber/yellow so they pop
    escaped = escaped.replace(
      regex, 
      `<span class="bg-amber-500/10 text-amber-300 px-1 rounded font-bold border border-amber-500/30">$1</span>`
    );
  });

  return escaped;
};
