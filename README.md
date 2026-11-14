# PlugX Premium IPTV Engine v5.2.0 • JioTV STB Format Edition

High-performance JioTV STB IPTV playlist generator and channel manager with ClearKey DRM support, dynamic token injection, multi-format export, and an interactive React web dashboard.

Built with TanStack Start, React 19, TypeScript, and Tailwind CSS. Connected with [Lovable](https://lovable.dev).

---

## Features
- **Exact JioTV STB Format Output**: Generates `#EXTM3U` playlists with `#EXTINF` and `#KODIPROP` attributes (inputstream, manifest_type, license_type, license_key) matching the reference format byte-for-byte.
- **Dynamic ClearKey Injection**: Automatically extracts, normalizes, and embeds ClearKey KID:KEY license keys for encrypted streams.
- **Auto `__hdnea__` Token Appending**: Automatically extracts tokens from session cookies and attaches them to MPD manifest URLs.
- **Multi-Format Export**:
  - `M3U`: `#EXTM3U` playlist for Kodi, VLC, TiviMate, OTT Navigator, Sparkle TV, IPTV Smarters.
  - `JSON`: Full channel roster dump with metadata, groups, logos, and expiry details.
  - `XMLTV`: EPG skeleton format for electronic program guides.
  - `TXT`: Clean list of direct stream URLs.
- **Health & Diagnostics Endpoint**: Real-time status, token expiry countdown, IST timestamps, channel and category counts.
- **Interactive Web Dashboard**: Search, filter by category/group, view channel info, copy stream URLs, and download playlists with one click.

---

## API Endpoints

| Endpoint | Description |
| --- | --- |
| `/api/playlist?view=raw` | Raw M3U playlist (JioTV STB format) |
| `/api/playlist?view=raw&format=json` | Full JSON channels dump |
| `/api/playlist?view=raw&format=xmltv` | XMLTV format EPG skeleton |
| `/api/playlist?view=raw&format=txt` | Plain text stream URLs |
| `/api/playlist?view=raw&health=1` | Engine health & token expiry status |

### Query Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `view=raw` | string | Returns raw playlist or direct data output |
| `format` | `m3u` \| `json` \| `xmltv` \| `txt` | Output format (default: `m3u`) |
| `group` | string | Filter channels by category/group (e.g., `Movies`, `Sports`) |
| `q` | string | Case-insensitive search by channel name or group |
| `limit` | number | Limit the number of returned channels |
| `download` | boolean (`1`) | Triggers browser attachment download |
| `refresh` | boolean (`1`) | Bypasses cache and forces live re-fetch from upstream |
| `ua` | string | User-Agent override (`shoebbro`, `jio`, `kodi`, `vlc`, `tivimate`, `ott`) |

---

## Development

```sh
npm install
npm run dev     # Starts local development server
npm run build   # Production build with Nitro / Vite
npm test        # Run Vitest test suite
```
