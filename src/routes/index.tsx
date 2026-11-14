import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { NormalizedChannel, EngineHealth } from '@/lib/types';
import { ChannelList } from '@/components/ChannelList';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'PlugX Premium IPTV Engine v5.2.0 — JioTV STB Edition' },
      {
        name: 'description',
        content:
          'High-performance JioTV STB IPTV playlist generator with ClearKey DRM support, dynamic tokens, and multi-format export for VLC, Kodi, TiviMate, and OTT Navigator.',
      },
      { property: 'og:title', content: 'PlugX Premium IPTV Engine v5.2.0' },
      {
        property: 'og:description',
        content:
          'High-performance JioTV STB IPTV playlist generator with ClearKey DRM support and multi-format export.',
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [channels, setChannels] = useState<NormalizedChannel[]>([]);
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<NormalizedChannel | null>(null);
  const [format, setFormat] = useState<'m3u' | 'json' | 'xmltv' | 'txt'>('m3u');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [uaOverride, setUaOverride] = useState('shoebbro');
  const [copiedLink, setCopiedLink] = useState(false);

  const apiEndpoint = typeof window !== 'undefined' ? window.location.origin + '/api/playlist' : '/api/playlist';

  const playlistUrl = `${apiEndpoint}?view=raw${format !== 'm3u' ? `&format=${format}` : ''}${selectedGroup ? `&group=${encodeURIComponent(selectedGroup)}` : ''}${uaOverride !== 'shoebbro' ? `&ua=${uaOverride}` : ''}`;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`${apiEndpoint}?view=raw&format=json`);
        if (res.ok) {
          const data = (await res.json()) as { channels?: NormalizedChannel[] };
          if (data && data.channels) {
            setChannels(data.channels);
          }
        }
        const healthRes = await fetch(`${apiEndpoint}?view=raw&health=1`);
        if (healthRes.ok) {
          const healthData = (await healthRes.json()) as EngineHealth;
          setHealth(healthData);
        }
      } catch (e) {
        console.error('Failed to load playlist data:', e);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [apiEndpoint]);

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Premium Plug X</h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  v5.2.0
                </span>
              </div>
              <p className="text-xs text-muted-foreground">JioTV STB Engine & Playlist Manager</p>
            </div>
          </div>

          {health && (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-foreground uppercase">{health.source}</span>
              </div>
              <div className="hidden sm:block text-muted-foreground">
                Next refresh: <span className="text-foreground">{health.next_refresh_ist}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Quick Stats Banner */}
        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground uppercase">Channels</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{health.channels}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground uppercase">Categories</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {Object.keys(health.groups || {}).length}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground uppercase">Token Expiry</p>
              <p className="text-xs font-mono mt-2 text-foreground truncate" title={health.token_expiry_ist || 'N/A'}>
                {health.token_expiry_ist || 'N/A'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground uppercase">Status</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold capitalize text-foreground">{health.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Playlist Link Generator */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-lg font-semibold mb-2 text-foreground">Playlist Generator & Export</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Configure output format, filters, and user agents for VLC, Kodi, TiviMate, or OTT Navigator.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="m3u">M3U Playlist (JioTV STB)</option>
                <option value="json">JSON API Dump</option>
                <option value="xmltv">XMLTV (EPG Skeleton)</option>
                <option value="txt">TXT Stream URLs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                User Agent Profile
              </label>
              <select
                value={uaOverride}
                onChange={(e) => setUaOverride(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="shoebbro">Default (@shoebbro)</option>
                <option value="jio">JioTV+ AndroidTV</option>
                <option value="kodi">Kodi 20.5 (Android 11)</option>
                <option value="vlc">VLC LibVLC 3.0</option>
                <option value="tivimate">TiviMate 4.7</option>
                <option value="ott">OTT Navigator 1.7</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Category Filter
              </label>
              <input
                type="text"
                placeholder="e.g. Movies, Sports..."
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 font-mono text-xs text-primary break-all select-all">
              {playlistUrl}
            </div>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(playlistUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-lg transition-all shadow-sm active:scale-95"
            >
              {copiedLink ? 'Copied Link!' : 'Copy Playlist Link'}
            </button>
            <a
              href={`${playlistUrl}&download=1`}
              className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-sm rounded-lg transition-all text-center"
            >
              Download
            </a>
          </div>
        </section>

        {/* Channel Explorer */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Live Channel Roster</h2>
              <p className="text-sm text-muted-foreground">
                Browse channels with auto-attached ClearKey keys and MPD tokens.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-mono">Fetching channels from JioSTB engine...</p>
            </div>
          ) : (
            <ChannelList channels={channels} onSelectChannel={setSelectedChannel} />
          )}
        </section>
      </div>

      {/* Modal / Channel Info Drawer */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-foreground">
            <button
              onClick={() => setSelectedChannel(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
                {selectedChannel.logo ? (
                  <img src={selectedChannel.logo} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="font-bold text-muted-foreground">TV</span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedChannel.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {selectedChannel.id} • {selectedChannel.group}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block mb-1">Stream URL</span>
                <div className="bg-background p-2.5 rounded border border-border text-foreground break-all select-all">
                  {selectedChannel.url}
                </div>
              </div>

              {selectedChannel.clearkey && (
                <div>
                  <span className="text-muted-foreground block mb-1">ClearKey License (KID:KEY)</span>
                  <div className="bg-background p-2.5 rounded border border-border text-purple-400 break-all select-all">
                    {selectedChannel.clearkey}
                  </div>
                </div>
              )}

              {selectedChannel.cookie && (
                <div>
                  <span className="text-muted-foreground block mb-1">Token Cookie (__hdnea__)</span>
                  <div className="bg-background p-2.5 rounded border border-border text-muted-foreground break-all select-all max-h-24 overflow-y-auto">
                    {selectedChannel.cookie}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedChannel(null)}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground font-mono">
        PlugX Premium IPTV Engine v5.2.0 • @PlugX & @shoebbro
      </footer>
    </main>
  );
}
