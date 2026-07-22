import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: any, res: any) {
  // Set JSON content type & CORS
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Extract siteKey query parameter
  const urlObj = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const siteKey = urlObj.searchParams.get("siteKey") || req.query?.siteKey;

  if (!siteKey || typeof siteKey !== "string") {
    return res.status(400).json({ error: "Site Key query parameter is required." });
  }

  const targetUrl = `http://aggregator.unbxdapi.com/analytics-aggregator/sites/get-site/${encodeURIComponent(siteKey)}`;

  try {
    const response = await fetch(targetUrl, { 
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000) 
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Aggregator API returned HTTP error ${response.status}` 
      });
    }

    const data: any = await response.json();
    
    if (data && data.Sites && Array.isArray(data.Sites) && data.Sites.length > 0) {
      const siteDetails = data.Sites[0];
      if (siteDetails.apiKey) {
        return res.json({
          siteKey: siteKey,
          apiKey: siteDetails.apiKey,
          siteName: siteDetails.siteName || siteKey,
          siteDetails: siteDetails
        });
      }
    }
    
    return res.status(404).json({ 
      error: `No API key or configuration found for Site Key: "${siteKey}". Please double-check the key.` 
    });
  } catch (error: any) {
    console.error("Error communicating with Unbxd Aggregator API:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to fetch data from the Aggregator API. Make sure the server can reach aggregator.unbxdapi.com." 
    });
  }
}
