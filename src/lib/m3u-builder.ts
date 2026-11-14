/**
 * PlugX Premium IPTV Engine v5.2.0 • M3U, XMLTV & Format Builders
 */

import { NormalizedChannel } from './types';

/**
 * Escapes double quotes and strips line breaks for M3U attribute values.
 */
export function esc(v: string): string {
  return v.replace(/"/g, "'").replace(/[\r\n]/g, '');
}

/**
 * Cleans whitespace and line breaks from stream URLs.
 */
export function cleanUrl(u: string): string {
  return u.replace(/[\r\n\s]/g, '').trim();
}

/**
 * Extracts __hdnea__=... parameter from cookie string.
 */
export function hdneaPair(cookie: string): string {
  if (!cookie) return '';
  const m = cookie.match(/__hdnea__=([^;]+)/);
  return m && m[1] ? `__hdnea__=${m[1]}` : '';
}

/**
 * Parses clearkey into canonical kid:key,kid2:key2 format.
 */
export function parseClearKey(raw: unknown): string {
  const pairs: string[] = [];

  if (typeof raw === 'string' && raw.trim() !== '') {
    for (const item of raw.split(',')) {
      const pair = item.trim();
      if (!pair) continue;
      const parts = pair.split(':');
      if (parts.length !== 2) continue;
      const kid = parts[0]?.trim().toLowerCase() ?? '';
      const key = parts[1]?.trim().toLowerCase() ?? '';
      if (!kid || !key) continue;
      if (kid === '00000000000000000000000000000000') continue;
      pairs.push(`${kid}:${key}`);
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const kid = String(k).trim().toLowerCase();
      const key = String(v ?? '').trim().toLowerCase();
      if (!kid || !key) continue;
      if (kid === '00000000000000000000000000000000') continue;
      pairs.push(`${kid}:${key}`);
    }
  }

  return pairs.join(',');
}

/**
 * Builds JioTV STB format M3U playlist.
 *
 * - First line: #EXTM3U
 * - #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",<name>
 * - #KODIPROP:inputstream=inputstream.adaptive
 * - #KODIPROP:inputstream.adaptive.manifest_type=mpd|hls
 * - #KODIPROP:inputstream.adaptive.license_type=clearkey (if clearkey present)
 * - #KODIPROP:inputstream.adaptive.license_key=KID:KEY (if clearkey present)
 * - Stream URL (with __hdnea__ appended if missing and present in cookie)
 */
export function buildM3U(channels: NormalizedChannel[]): string {
  let out = '#EXTM3U\n';

  for (const c of channels) {
    const name = c.name;
    const group = c.group;
    const logo = c.logo;
    const id = c.id;
    const ck = c.clearkey;

    // #EXTINF (tvg-id first, tight comma)
    out += `#EXTINF:-1 tvg-id="${esc(id)}" tvg-name="${esc(name)}" tvg-logo="${esc(logo)}" group-title="${esc(group)}",${name.replace(/[\r\n]/g, '')}\n`;

    // #KODIPROP lines
    out += '#KODIPROP:inputstream=inputstream.adaptive\n';
    out += `#KODIPROP:inputstream.adaptive.manifest_type=${c.manifest}\n`;
    if (ck) {
      out += '#KODIPROP:inputstream.adaptive.license_type=clearkey\n';
      out += `#KODIPROP:inputstream.adaptive.license_key=${ck}\n`;
    }

    // Stream URL: keep as-is; append __hdnea__ only if missing
    let url = c.url;
    const hdnea = hdneaPair(c.cookie);
    if (hdnea && !url.includes('__hdnea__')) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}${hdnea}`;
    }
    out += `${url}\n`;
  }

  return out;
}

/**
 * Builds XMLTV EPG skeleton format.
 */
export function buildXmltv(channels: NormalizedChannel[], brand: string): string {
  const xmlEsc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  let out = '<?xml version="1.0" encoding="UTF-8"?>\n';
  out += '<!DOCTYPE tv SYSTEM "xmltv.dtd">\n';
  out += `<tv generator-info-name="${xmlEsc(brand)}">\n`;

  for (const c of channels) {
    const channelId = c.id || c.name;
    out += `  <channel id="${xmlEsc(channelId)}">\n`;
    if (c.logo) {
      out += `    <icon src="${xmlEsc(c.logo)}"/>\n`;
    }
    out += `    <display-name>${xmlEsc(c.name)}</display-name>\n`;
    out += '  </channel>\n';
  }

  out += '</tv>\n';
  return out;
}

/**
 * Builds TXT URL list.
 */
export function buildTxt(channels: NormalizedChannel[]): string {
  return channels.map((c) => c.url).join('\n') + '\n';
}
