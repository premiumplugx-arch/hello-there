/**
 * Public playlist endpoint — /api/public/playlist
 */
import { createFileRoute } from '@tanstack/react-router';
import { playlistHandlers } from '@/lib/iptv-engine';

export const Route = createFileRoute('/api/public/playlist')({
  server: { handlers: playlistHandlers() },
});
