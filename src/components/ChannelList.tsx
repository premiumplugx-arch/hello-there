import React, { useState, useMemo } from 'react';
import { NormalizedChannel } from '@/lib/types';

interface ChannelListProps {
  channels: NormalizedChannel[];
  onSelectChannel?: (channel: NormalizedChannel) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({ channels, onSelectChannel }) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => {
      if (c.group) set.add(c.group);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      const matchesGroup = selectedGroup === 'ALL' || c.group.toLowerCase() === selectedGroup.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.group.toLowerCase().includes(search.toLowerCase()) ||
        c.id.includes(search);
      return matchesGroup && matchesSearch;
    });
  }, [channels, selectedGroup, search]);

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Search and Category Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search channel name, group or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-sm text-muted-foreground font-mono">
          Showing <span className="text-foreground font-bold">{filteredChannels.length}</span> of {channels.length} channels
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedGroup === group
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredChannels.map((channel) => (
          <div
            key={channel.id || channel.name}
            className="group relative bg-card border border-border hover:border-primary/50 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground font-bold">TV</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate" title={channel.name}>
                    {channel.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      ID: {channel.id || 'N/A'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {channel.group}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                    channel.manifest === 'mpd'
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  }`}
                >
                  {channel.manifest}
                </span>

                {channel.clearkey ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                    ClearKey DRM
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                    No DRM
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
              <button
                onClick={() => handleCopy(channel.url, channel.id + '-url')}
                className="flex-1 text-xs py-1.5 px-2 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors text-center"
              >
                {copiedId === channel.id + '-url' ? 'Copied URL!' : 'Copy Stream'}
              </button>

              {channel.clearkey && (
                <button
                  onClick={() => handleCopy(channel.clearkey, channel.id + '-key')}
                  className="text-xs py-1.5 px-2.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-mono transition-colors"
                  title="Copy ClearKey KID:KEY"
                >
                  {copiedId === channel.id + '-key' ? 'Key Copied!' : 'Key'}
                </button>
              )}

              {onSelectChannel && (
                <button
                  onClick={() => onSelectChannel(channel)}
                  className="text-xs py-1.5 px-2.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title="View Channel Details"
                >
                  Info
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
