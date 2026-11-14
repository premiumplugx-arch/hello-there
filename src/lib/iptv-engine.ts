/**
 * PlugX Premium IPTV Engine v5.2.0 • Core TypeScript Engine
 */

import {
  RawChannel,
  NormalizedChannel,
  EngineConfig,
  EngineHealth,
  EngineOptions,
  EngineResult,
} from './types';
import {
  cleanUrl,
  parseClearKey,
  buildM3U,
  buildXmltv,
  buildTxt,
} from './m3u-builder';

export const DEFAULT_CONFIG: EngineConfig = {
  apis: ['https://stbpllive.bmera5952.workers.dev/'],
  cacheTtl: 300,
  staleTtl: 900,
  refreshSkew: 30,
  cookieTtl: 21600,
  brand: 'Premium Plug X',
  tagline: 'Ultimate IPTV Engine',
  credit: '@PlugX',
  version: '5.2.0',
  timezone: 'Asia/Kolkata',
  tzLabel: 'IST',
  ua: {
    shoebbro: '@shoebbro',
    jio: 'JioTVPlus/2.8.4_2076/PlugX(PlugX;JioSTB) JioTvPlus-AndroidTv',
    kodi: 'Kodi/20.5 (Linux; Android 11) Android/11 Sys_Arch:arm64-v8a',
    vlc: 'VLC/3.0.20 LibVLC/3.0.20',
    tivimate: 'TiviMate/4.7.0 (Linux; Android 11)',
    ott: 'OTT Navigator/1.7.0.1 (Linux; Android 11)',
  },
  defaultUa: 'shoebbro',
  preserveOrder: true,
  requireHttps: true,
  dedupe: true,
  cors: true,
  gzip: true,
  logErrors: true,
};

/**
 * Format timestamp into IST (Asia/Kolkata) string: YYYY-MM-DD HH:mm:ss IST
 */
export function formatIST(tsSec: number, tzLabel = 'IST'): string {
  const d = new Date(tsSec * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map['year']}-${map['month']}-${map['day']} ${map['hour']}:${map['minute']}:${map['second']} ${tzLabel}`;
}

/**
 * Human-readable duration: Xd Xh Xm Xs or 'expired'
 */
export function humanSeconds(s: number): string {
  if (s <= 0) return 'expired';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h) parts.push(`${sec}s`);
  return parts.join(' ').trim();
}

/**
 * Parses cookie string to find token expiration timestamp.
 */
export function cookieExpiry(cookie: string, ttl = 21600): number | null {
  if (!cookie) return null;
  const hdneaMatch = cookie.match(/__hdnea__=([^;]+)/);
  if (hdneaMatch && hdneaMatch[1]) {
    const hdnea = hdneaMatch[1];
    const expMatch = hdnea.match(/~exp=(\d{9,})~/);
    if (expMatch && expMatch[1]) {
      return parseInt(expMatch[1], 10);
    }
    const stMatch = hdnea.match(/(?:^|[?&~])st=(\d{9,})~/);
    if (stMatch && stMatch[1]) {
      return parseInt(stMatch[1], 10) + ttl;
    }
  }
  return null;
}

/**
 * Finds earliest cookie expiration timestamp in channel array.
 */
export function payloadCookieExpiry(channels: RawChannel[], ttl = 21600): number | null {
  let earliest: number | null = null;
  for (const row of channels) {
    if (!row || typeof row !== 'object') continue;
    let cookie = '';
    if (row.headers && typeof row.headers === 'object') {
      cookie = String(row.headers.cookie ?? row.headers.Cookie ?? '');
    }
    if (!cookie && row.cookie) {
      cookie = String(row.cookie);
    }
    const exp = cookieExpiry(cookie, ttl);
    if (exp !== null) {
      earliest = earliest === null ? exp : Math.min(earliest, exp);
    }
  }
  return earliest;
}

/**
 * Normalizes raw channels into clean uniform structures.
 */
export function normalizeChannels(
  channels: RawChannel[],
  generatedAt: number | null,
  config: EngineConfig = DEFAULT_CONFIG,
): {
  norm: NormalizedChannel[];
  groupCounts: Record<string, number>;
  expiredCount: number;
  earliestExp: number | null;
} {
  const seen = new Set<string>();
  const norm: NormalizedChannel[] = [];
  let earliestExp: number | null = null;
  let expiredCount = 0;
  const nowTs = Math.floor(Date.now() / 1000);
  const groupCounts: Record<string, number> = {};

  for (const row of channels) {
    if (!row || typeof row !== 'object') continue;

    const id = String(row.id ?? '').trim();
    const name = String(row.name ?? '').trim();
    if (!name) continue;

    if (config.dedupe && id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }

    let url = '';
    const possibleUrls = [
      row.mpd_url,
      row.hls_url,
      row.stream_url,
      row.url,
      row.link,
      row.play_url,
    ];
    for (const u of possibleUrls) {
      if (typeof u === 'string' && u.trim()) {
        url = u;
        break;
      }
    }
    url = cleanUrl(url);
    if (!url) continue;

    if (config.requireHttps && url.toLowerCase().startsWith('http://')) {
      url = 'https://' + url.slice(7);
    }

    let type = String(row.type ?? '').trim().toLowerCase();
    if (!type) {
      type = url.toLowerCase().includes('.mpd') ? 'dash' : 'hls';
    }
    const manifest: 'mpd' | 'hls' =
      type === 'dash' || type === 'mpd' ? 'mpd' : 'hls';

    let group = String(row.group ?? row.category ?? 'General').trim();
    if (!group) group = 'General';

    const logo = String(row.logo ?? row.tvg_logo ?? '').trim();

    let cookie = '';
    if (row.headers && typeof row.headers === 'object') {
      cookie = String(row.headers.cookie ?? row.headers.Cookie ?? '');
    }
    if (!cookie && row.cookie) {
      cookie = String(row.cookie);
    }

    const clearkey = parseClearKey(row.clearkey);

    let exp = cookieExpiry(cookie, config.cookieTtl);
    if (exp === null && cookie && generatedAt !== null) {
      exp = generatedAt + config.cookieTtl;
    }
    if (exp !== null) {
      if (exp <= nowTs) expiredCount++;
      earliestExp = earliestExp === null ? exp : Math.min(earliestExp, exp);
    }

    norm.push({
      id,
      name,
      group,
      logo,
      manifest,
      type,
      url,
      cookie,
      clearkey,
      exp,
    });

    groupCounts[group] = (groupCounts[group] ?? 0) + 1;
  }

  return { norm, groupCounts, expiredCount, earliestExp };
}

/**
 * Filters normalized channels by group, query, limit.
 */
export function filterChannels(
  channels: NormalizedChannel[],
  opts: { group?: string; q?: string; limit?: number },
): NormalizedChannel[] {
  let list = channels;

  if (opts.group && opts.group.trim()) {
    const g = opts.group.trim().toLowerCase();
    list = list.filter((c) => c.group.toLowerCase() === g);
  }

  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
    );
  }

  if (opts.limit && opts.limit > 0) {
    list = list.slice(0, opts.limit);
  }

  return list;
}

// In-memory cache for channels
let memoryCache: {
  key: string;
  data: RawChannel[];
  timestamp: number;
} | null = null;

/**
 * Fetch raw channels with cache support.
 */
export async function fetchChannels(
  config: EngineConfig = DEFAULT_CONFIG,
  forceRefresh = false,
): Promise<{
  channels: RawChannel[];
  source: 'live' | 'cache' | 'stale-cache' | 'live-forced' | 'none';
  generatedAt: number;
}> {
  const cacheKey = config.apis.join('|');
  const now = Math.floor(Date.now() / 1000);

  // Check valid cache
  if (!forceRefresh && memoryCache && memoryCache.key === cacheKey) {
    const age = now - memoryCache.timestamp;
    const cookieExp = payloadCookieExpiry(memoryCache.data, config.cookieTtl);
    if (age <= config.cacheTtl && (!cookieExp || cookieExp > now)) {
      return {
        channels: memoryCache.data,
        source: 'cache',
        generatedAt: memoryCache.timestamp,
      };
    }
  }

  // Fetch live
  for (const api of config.apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(api, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json, */*',
          'User-Agent': 'PlugX-Engine/5.2',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          memoryCache = {
            key: cacheKey,
            data: json as RawChannel[],
            timestamp: now,
          };
          return {
            channels: json as RawChannel[],
            source: forceRefresh ? 'live-forced' : 'live',
            generatedAt: now,
          };
        }
      }
    } catch (err) {
      if (config.logErrors) {
        console.error(`[PlugX Engine] Failed fetching ${api}:`, err);
      }
    }
  }

  // Stale cache fallback
  if (memoryCache && memoryCache.key === cacheKey) {
    const age = now - memoryCache.timestamp;
    if (age <= config.staleTtl) {
      return {
        channels: memoryCache.data,
        source: 'stale-cache',
        generatedAt: memoryCache.timestamp,
      };
    }
  }

  return {
    channels: memoryCache ? memoryCache.data : [],
    source: memoryCache ? 'stale-cache' : 'none',
    generatedAt: memoryCache ? memoryCache.timestamp : now,
  };
}

/**
 * Handle incoming request options and return HTTP response data.
 */
export async function handleEngineRequest(
  options: EngineOptions,
  customConfig?: Partial<EngineConfig>,
): Promise<EngineResult> {
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...customConfig };
  const inFormat = (options.format || 'm3u').toLowerCase();
  const forceRefresh = !!options.refresh;
  const isHealth = !!options.health;
  const isDownload = !!options.download;

  const uaKey = (options.ua || config.defaultUa).toLowerCase();
  const streamUA = config.ua[uaKey] ?? config.ua[config.defaultUa] ?? '@shoebbro';

  const { channels: rawChannels, source, generatedAt } = await fetchChannels(
    config,
    forceRefresh,
  );

  let genTime = generatedAt;
  const payloadExpiry = payloadCookieExpiry(rawChannels, config.cookieTtl);
  if (payloadExpiry !== null) {
    genTime = payloadExpiry - config.cookieTtl;
  }

  const { norm: fullNorm, groupCounts, expiredCount, earliestExp } =
    normalizeChannels(rawChannels, genTime, config);

  const filteredNorm = filterChannels(fullNorm, {
    group: options.group,
    q: options.q,
    limit: options.limit,
  });

  const now = Math.floor(Date.now() / 1000);
  const nextRefresh =
    earliestExp !== null
      ? Math.max(now + 30, earliestExp - config.refreshSkew)
      : now + 3600;
  const secsToRefresh = nextRefresh - now;
  const secsToExpiry = earliestExp !== null ? earliestExp - now : null;

  const baseHeaders: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    'X-PlugX-Version': config.version,
    'X-PlugX-Generated': new Date(genTime * 1000).toISOString(),
    'X-PlugX-Refresh': new Date(nextRefresh * 1000).toISOString(),
    'X-PlugX-Channels': String(filteredNorm.length),
    'X-PlugX-Source': source,
  };

  if (config.cors) {
    baseHeaders['Access-Control-Allow-Origin'] = '*';
    baseHeaders['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
    baseHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  // 1. Health Endpoint
  if (isHealth) {
    const healthData: EngineHealth = {
      status: source === 'none' ? 'down' : 'ok',
      brand: config.brand,
      version: config.version,
      generated_ist: formatIST(genTime, config.tzLabel),
      next_refresh_ist: formatIST(nextRefresh, config.tzLabel),
      in_seconds: secsToRefresh,
      token_expiry_ist: earliestExp ? formatIST(earliestExp, config.tzLabel) : null,
      expires_in: secsToExpiry,
      expired_channels: expiredCount,
      channels: filteredNorm.length,
      groups: groupCounts,
      source,
      ua: uaKey,
      ua_value: streamUA,
    };

    return {
      body: healthData,
      contentType: 'application/json; charset=utf-8',
      headers: baseHeaders,
      status: 200,
    };
  }

  // 2. Format: JSON
  if (inFormat === 'json') {
    if (isDownload) {
      baseHeaders['Content-Disposition'] = 'attachment; filename="plugx.json"';
    }
    const jsonOutput = {
      meta: {
        brand: config.brand,
        version: config.version,
        generated_ist: formatIST(genTime, config.tzLabel),
        next_refresh_ist: formatIST(nextRefresh, config.tzLabel),
        in_seconds: secsToRefresh,
        token_expiry_ist: earliestExp ? formatIST(earliestExp, config.tzLabel) : null,
        source,
        channels: filteredNorm.length,
        groups: groupCounts,
      },
      channels: filteredNorm,
    };
    return {
      body: jsonOutput,
      contentType: 'application/json; charset=utf-8',
      headers: baseHeaders,
      status: 200,
    };
  }

  // 3. Format: TXT
  if (inFormat === 'txt') {
    if (isDownload) {
      baseHeaders['Content-Disposition'] = 'attachment; filename="plugx.txt"';
    }
    return {
      body: buildTxt(filteredNorm),
      contentType: 'text/plain; charset=utf-8',
      headers: baseHeaders,
      status: 200,
    };
  }

  // 4. Format: XMLTV
  if (inFormat === 'xmltv') {
    if (isDownload) {
      baseHeaders['Content-Disposition'] = 'attachment; filename="plugx.xml"';
    }
    return {
      body: buildXmltv(filteredNorm, config.brand),
      contentType: 'application/xml; charset=utf-8',
      headers: baseHeaders,
      status: 200,
    };
  }

  // 5. Default: Raw M3U (JioTV STB Format)
  if (isDownload) {
    baseHeaders['Content-Type'] = 'audio/x-mpegurl; charset=utf-8';
    baseHeaders['Content-Disposition'] = 'attachment; filename="plugx.m3u"';
  } else {
    baseHeaders['Content-Type'] = 'text/plain; charset=utf-8';
    baseHeaders['Content-Disposition'] = 'inline';
    baseHeaders['X-Content-Type-Options'] = 'nosniff';
  }

  return {
    body: buildM3U(filteredNorm),
    contentType: baseHeaders['Content-Type'] ?? 'text/plain; charset=utf-8',
    headers: baseHeaders,
    status: 200,
  };
}

/**
 * Handle incoming Web standard Request object for TanStack Start / Nitro / Express.
 */
export async function handlePlaylistRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const options: EngineOptions = {
    view: searchParams.get('view') ?? undefined,
    format: (searchParams.get('format') as EngineOptions['format']) ?? undefined,
    group: searchParams.get('group') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    limit: searchParams.has('limit') ? parseInt(searchParams.get('limit') || '0', 10) : undefined,
    download: searchParams.has('download'),
    health: searchParams.has('health'),
    refresh: searchParams.has('refresh'),
    ua: searchParams.get('ua') ?? undefined,
  };

  const result = await handleEngineRequest(options);

  const responseBody =
    typeof result.body === 'string'
      ? result.body
      : JSON.stringify(result.body, null, 2);

  const responseHeaders = new Headers(result.headers);
  responseHeaders.set('Content-Type', result.contentType);

  return new Response(responseBody, {
    status: result.status,
    headers: responseHeaders,
  });
}

/**
 * Server handlers map for TanStack Start createFileRoute.
 */
export function playlistHandlers() {
  const any = async ({ request }: { request: Request }) => handlePlaylistRequest(request);
  return {
    GET: any,
    HEAD: any,
    OPTIONS: async () =>
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }),
  };
}
