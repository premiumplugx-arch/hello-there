import { describe, it, expect } from 'vitest';
import { parseClearKey, buildM3U, buildXmltv, buildTxt, esc } from '@/lib/m3u-builder';
import { cookieExpiry, filterChannels, normalizeChannels } from '@/lib/iptv-engine';
import { NormalizedChannel, RawChannel } from '@/lib/types';

describe('PlugX IPTV Engine Unit Tests', () => {
  it('parses clearkey correctly from string and object', () => {
    const rawStr = '7b3d2290787255ac9cdaf43ae31eacce:d0edfa8ebd655926c5e2932d8c59b3d1,00000000000000000000000000000000:0000000000000000';
    expect(parseClearKey(rawStr)).toBe('7b3d2290787255ac9cdaf43ae31eacce:d0edfa8ebd655926c5e2932d8c59b3d1');

    const rawObj = {
      '7B3D2290787255AC9CDAF43AE31EACCE': 'D0EDFA8EBD655926C5E2932D8C59B3D1',
    };
    expect(parseClearKey(rawObj)).toBe('7b3d2290787255ac9cdaf43ae31eacce:d0edfa8ebd655926c5e2932d8c59b3d1');
  });

  it('extracts cookie expiry from __hdnea__ tokens', () => {
    const cookie = '__hdnea__=st=1794657314~exp=1794678914~acl=/bpk-tv/*~hmac=12345';
    expect(cookieExpiry(cookie)).toBe(1794678914);

    const cookieStOnly = '__hdnea__=st=1794657314~acl=/bpk-tv/*~hmac=12345';
    expect(cookieExpiry(cookieStOnly, 21600)).toBe(1794657314 + 21600);
  });

  it('normalizes channels and applies deduplication', () => {
    const raw: RawChannel[] = [
      {
        id: '167',
        name: 'Zee TV HD',
        group: 'Entertainment',
        logo: 'https://img.media.jio.com/logo.jpg',
        mpd_url: 'http://jiotvpllive.cdn.jio.com/index.mpd',
        clearkey: 'kid1:key1',
      },
      {
        id: '167', // duplicate
        name: 'Zee TV HD Duplicate',
        url: 'https://duplicate.com/index.mpd',
      },
    ];

    const { norm, groupCounts } = normalizeChannels(raw, 1000);
    expect(norm).toHaveLength(1);
    expect(norm[0]?.name).toBe('Zee TV HD');
    expect(norm[0]?.url).toBe('https://jiotvpllive.cdn.jio.com/index.mpd'); // upgraded to https
    expect(norm[0]?.manifest).toBe('mpd');
    expect(groupCounts['Entertainment']).toBe(1);
  });

  it('filters channels by group, query, and limit', () => {
    const channels: NormalizedChannel[] = [
      {
        id: '1',
        name: 'Star Gold HD',
        group: 'Movies',
        logo: '',
        manifest: 'mpd',
        type: 'dash',
        url: 'https://test.com/1',
        cookie: '',
        clearkey: '',
        exp: null,
      },
      {
        id: '2',
        name: 'Sony Sports Ten 1 HD',
        group: 'Sports',
        logo: '',
        manifest: 'mpd',
        type: 'dash',
        url: 'https://test.com/2',
        cookie: '',
        clearkey: '',
        exp: null,
      },
    ];

    expect(filterChannels(channels, { group: 'Movies' })).toHaveLength(1);
    expect(filterChannels(channels, { q: 'sports' })).toHaveLength(1);
    expect(filterChannels(channels, { limit: 1 })).toHaveLength(1);
  });

  it('builds exact JioTV STB format M3U', () => {
    const channels: NormalizedChannel[] = [
      {
        id: '167',
        name: 'Zee TV HD',
        group: 'Entertainment',
        logo: 'https://logo.jpg',
        manifest: 'mpd',
        type: 'dash',
        url: 'https://jiotv.com/index.mpd',
        cookie: '__hdnea__=st=123~exp=456~hmac=789',
        clearkey: 'kid1:key1',
        exp: 456,
      },
    ];

    const m3u = buildM3U(channels);
    expect(m3u).toContain('#EXTM3U\n');
    expect(m3u).toContain('#EXTINF:-1 tvg-id="167" tvg-name="Zee TV HD" tvg-logo="https://logo.jpg" group-title="Entertainment",Zee TV HD\n');
    expect(m3u).toContain('#KODIPROP:inputstream=inputstream.adaptive\n');
    expect(m3u).toContain('#KODIPROP:inputstream.adaptive.manifest_type=mpd\n');
    expect(m3u).toContain('#KODIPROP:inputstream.adaptive.license_type=clearkey\n');
    expect(m3u).toContain('#KODIPROP:inputstream.adaptive.license_key=kid1:key1\n');
    expect(m3u).toContain('https://jiotv.com/index.mpd?__hdnea__=st=123~exp=456~hmac=789\n');
  });

  it('builds XMLTV format', () => {
    const channels: NormalizedChannel[] = [
      {
        id: '100',
        name: 'Test Channel',
        group: 'General',
        logo: 'https://logo.png',
        manifest: 'hls',
        type: 'hls',
        url: 'https://stream.m3u8',
        cookie: '',
        clearkey: '',
        exp: null,
      },
    ];

    const xml = buildXmltv(channels, 'Premium Plug X');
    expect(xml).toContain('<!DOCTYPE tv SYSTEM "xmltv.dtd">');
    expect(xml).toContain('<tv generator-info-name="Premium Plug X">');
    expect(xml).toContain('<channel id="100">');
    expect(xml).toContain('<display-name>Test Channel</display-name>');
  });

  it('builds TXT stream URL list', () => {
    const channels: NormalizedChannel[] = [
      {
        id: '1',
        name: 'Test',
        group: 'General',
        logo: '',
        manifest: 'hls',
        type: 'hls',
        url: 'https://stream1.m3u8',
        cookie: '',
        clearkey: '',
        exp: null,
      },
    ];
    expect(buildTxt(channels)).toBe('https://stream1.m3u8\n');
  });
});
