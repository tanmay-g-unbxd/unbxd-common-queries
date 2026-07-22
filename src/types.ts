export interface SiteDetails {
  siteKey: string;
  apiKey: string;
  siteName: string;
  siteType?: string;
  status?: string;
  createdDate?: string;
  updatedDate?: string;
  [key: string]: any;
}

export interface LookupResult {
  siteKey: string;
  apiKey?: string;
  siteName?: string;
  siteDetails?: SiteDetails;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface HistoryItem {
  id: string;
  siteKey: string;
  apiKey?: string;
  siteName?: string;
  timestamp: number;
  success: boolean;
  error?: string;
}
