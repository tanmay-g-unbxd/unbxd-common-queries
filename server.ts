import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// API proxy route to fetch API keys for Unbxd Site Keys
app.get("/api/get-api-key", async (req, res) => {
  const siteKey = req.query.siteKey;
  if (!siteKey || typeof siteKey !== "string") {
    return res.status(400).json({ error: "Site Key query parameter is required." });
  }

  const url = `http://aggregator.unbxdapi.com/analytics-aggregator/sites/get-site/${encodeURIComponent(siteKey)}`;

  try {
    // Node.js 18+ has a native fetch implementation
    const response = await fetch(url, { 
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000) 
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Aggregator API returned HTTP error ${response.status}` 
      });
    }

    const data: any = await response.json();
    
    // Check if the response contains Sites and has at least one item
    if (data && data.Sites && Array.isArray(data.Sites) && data.Sites.length > 0) {
      const siteDetails = data.Sites[0];
      if (siteDetails.apiKey) {
        return res.json({
          siteKey: siteKey,
          apiKey: siteDetails.apiKey,
          siteName: siteDetails.siteName || siteKey,
          // Expose all metadata in case they are useful for the Unbxd dashboard
          siteDetails: siteDetails
        });
      }
    }
    
    return res.status(404).json({ 
      error: `No API key or configuration found for Site Key: "${siteKey}". please double-check the key.` 
    });
  } catch (error: any) {
    console.error("Error communicating with Unbxd Aggregator API:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to fetch data from the Aggregator API. Make sure the server can reach aggregator.unbxdapi.com." 
    });
  }
});

// Vite dev server middleware integration and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
