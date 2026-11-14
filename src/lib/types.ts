/**
 * PlugX Premium IPTV Engine v5.2.0 • Type Definitions
 */

export interface RawChannelHeader {
  cookie?: string;
  Cookie?: string;
  [key: string]: unknown;
}

export interface RawChannel {
  id?: string | number;
  name?: string;
  group?: string;
  category?: string;
  logo?: string;
  tvg_logo?: string;
  mpd_url?: string;
  hls_url?: string;
  stream_url?: string;
  url?: string;
  link?: string;
  play_url?: string;
  type?: string;
  user_agent?: string;
  headers?: RawChannelHeader;
  cookie?: string;
  clearkey?: string | Record<string, string> | null;
  expires_in?: number | null;
  [key: string]: unknown;
}

export interface NormalizedChannel {
  id: string;
  name: string;
  group: string;
  logo: string;
  manifest: 'mpd' | 'hls';
  type: string;
  url: string;
  cookie: string;
  clearkey: string;
  exp: number | null;
}

export interface EngineConfig {
  apis: string[];
  cacheTtl: number;      // default 300s
  staleTtl: number;      // default 900s
  refreshSkew: number;   // default 30s
  cookieTtl: number;     // default 21600s (6h)
  brand: string;         // 'Premium Plug X'
  tagline: string;       // 'Ultimate IPTV Engine'
  credit: string;        // '@PlugX'
  version: string;       // '5.2.0'
  timezone: string;      // 'Asia/Kolkata'
  tzLabel: string;       // 'IST'
  ua: Record<string, string>;
  defaultUa: string;     // 'shoebbro'
  preserveOrder: boolean;
  requireHttps: boolean;
  dedupe: boolean;
  cors: boolean;
  gzip: boolean;
  logErrors: boolean;
}

export interface EngineHealth {
  status: 'ok' | 'down';
  brand: string;
  version: string;
  generated_ist: string;
  next_refresh_ist: string;
  in_seconds: number;
  token_expiry_ist: string | null;
  expires_in: number | null;
  expired_channels: number;
  channels: number;
  groups: Record<string, number>;
  source: 'live' | 'cache' | 'stale-cache' | 'live-forced' | 'none';
  ua: string;
  ua_value: string;
}

export interface EngineOptions {
  view?: string;
  format?: 'm3u' | 'json' | 'txt' | 'xmltv';
  group?: string;
  q?: string;
  limit?: number;
  download?: boolean;
  health?: boolean;
  refresh?: boolean;
  ua?: string;
}

export interface EngineResult {
  body: string | object;
  contentType: string;
  headers: Record<string, string>;
  status: number;
}
