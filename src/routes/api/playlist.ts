/**
 * PlugX Premium IPTV Engine API Route — /api/playlist
 *
 * Supports:
 *   ?view=raw              → raw M3U (JioTV STB format)
 *   ?format=json           → full JSON channels dump with metadata
 *   ?format=xmltv          → XMLTV EPG skeleton
 *   ?format=txt            → TXT list of stream URLs
 *   ?health=1              → Health status JSON
 *   ?group=Movies          → Filter by category/group
 *   ?q=search              → Search channel name or group
 *   ?limit=50              → Limit channel count
 *   ?download=1            → Browser attachment download
 *   ?refresh=1             → Force cache bypass
 *   ?ua=kodi               → User-agent profile override (shoebbro, jio, kodi, vlc, tivimate, ott)
 */
import { createFileRoute } from '@tanstack/react-router';
import { playlistHandlers } from '@/lib/iptv-engine';

export const Route = createFileRoute('/api/playlist')({
  server: { handlers: playlistHandlers() },
});
