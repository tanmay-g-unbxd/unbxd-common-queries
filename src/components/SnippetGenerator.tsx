import React, { useState } from "react";
import { Terminal, Copy, Check, Code } from "lucide-react";

interface SnippetGeneratorProps {
  siteKey: string;
  apiKey: string;
}

type TabType = "curl" | "javascript" | "python";

export const SnippetGenerator: React.FC<SnippetGeneratorProps> = ({ siteKey, apiKey }) => {
  const [activeTab, setActiveTab] = useState<TabType>("curl");
  const [copied, setCopied] = useState(false);

  const snippets = {
    curl: `curl -X GET \\
  "http://aggregator.unbxdapi.com/analytics-aggregator/sites/get-site/${siteKey}" \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer ${apiKey}"`,
    
    javascript: `// Fetch site details from Unbxd Aggregator API
const fetchSiteDetails = async () => {
  try {
    const siteKey = "${siteKey}";
    const apiKey = "${apiKey}";
    const url = \`http://aggregator.unbxdapi.com/analytics-aggregator/sites/get-site/\${siteKey}\`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      }
    });
    
    const data = await response.json();
    console.log("Unbxd Site Metadata:", data);
  } catch (error) {
    console.error("Failed to query Unbxd Aggregator:", error);
  }
};`,
    
    python: `import requests

site_key = "${siteKey}"
api_key = "${apiKey}"
url = f"http://aggregator.unbxdapi.com/analytics-aggregator/sites/get-site/{site_key}"

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {api_key}"
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    if response.status_code == 200:
        data = response.json()
        print("Unbxd Site Metadata:", data)
    else:
        print(f"Error {response.status_code}: {response.text}")
except Exception as e:
    print("Request failed:", e)`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden mt-6 transition-all duration-300 hover:border-white/15">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#050506] px-5 py-3.5">
        <div className="flex items-center gap-2 text-white/80 text-xs font-mono">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold tracking-wider uppercase">INTEGRATION CODE TEMPLATE</span>
        </div>
        
        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-all duration-300 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 px-3 py-1.5 rounded-xl active:scale-95 cursor-pointer font-mono"
          title="Copy snippet"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-white/60" />
              <span>COPY CODE</span>
            </>
          )
        }
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-white/10 bg-[#050506]/30 px-4">
        <button
          onClick={() => setActiveTab("curl")}
          className={`px-3 py-2.5 text-xs font-mono transition-all duration-200 border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === "curl"
              ? "border-indigo-500 text-indigo-300 bg-indigo-500/5 font-semibold"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          cURL
        </button>
        <button
          onClick={() => setActiveTab("javascript")}
          className={`px-3 py-2.5 text-xs font-mono transition-all duration-200 border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === "javascript"
              ? "border-indigo-500 text-indigo-300 bg-indigo-500/5 font-semibold"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          JavaScript (Fetch)
        </button>
        <button
          onClick={() => setActiveTab("python")}
          className={`px-3 py-2.5 text-xs font-mono transition-all duration-200 border-b-2 -mb-[1px] cursor-pointer ${
            activeTab === "python"
              ? "border-indigo-500 text-indigo-300 bg-indigo-500/5 font-semibold"
              : "border-transparent text-white/40 hover:text-white/80"
          }`}
        >
          Python
        </button>
      </div>

      {/* Code Display */}
      <div className="p-5 bg-black/50 overflow-x-auto custom-scrollbar">
        <pre className="text-xs font-mono text-indigo-200 whitespace-pre leading-relaxed select-all">
          {snippets[activeTab]}
        </pre>
      </div>
      <div className="px-5 py-3 bg-[#050507] border-t border-white/[0.04] text-[10px] text-white/30 font-mono flex items-center justify-between">
        <span>Site Key: <code className="text-indigo-400 font-bold">{siteKey}</code></span>
        <span>Environment: <span className="text-emerald-500 font-semibold">Developer Sandbox</span></span>
      </div>
    </div>
  );
};
