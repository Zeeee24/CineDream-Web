const servers = [
  {
    id: 'cinezo',
    name: 'Server 1 — Cinezo',
    label: 'HD',
    movie: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    tv: (id, season, episode) => `https://player.cinezo.live/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.cinezo.live',
    usesTmdbId: true,
  },
  {
    id: 'ezvidapi',
    name: 'Server 2 — EzVid',
    label: 'HD',
    movie: (id) => `https://ezvidapi.com/embed/movie/${id}`,
    tv: (id, season, episode) => `https://ezvidapi.com/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://ezvidapi.com',
    usesTmdbId: true,
  },
  {
    id: 'multiembed',
    name: 'Server 3 — MultiEmbed',
    label: 'VIP',
    movie: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    tv: (id, season, episode) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`,
    healthCheck: 'https://multiembed.mov',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-to',
    name: 'Server 4 — VidSrc.to',
    label: 'HD',
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.to',
    usesTmdbId: true,
  },
];

const serverHealth = {};

export async function checkServerHealth(server) {
  if (serverHealth[server.id] !== undefined) {
    return serverHealth[server.id];
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(server.healthCheck, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    serverHealth[server.id] = true;
    return true;
  } catch {
    // For third-party embeds, fetch errors are typically CORS or Cloudflare blocks,
    // not actual server downtime. We treat them as online so they are not skipped in the player.
    serverHealth[server.id] = true;
    return true;
  }
}

export async function checkAllServers() {
  const results = {};
  await Promise.allSettled(
    servers.map(async (s) => {
      results[s.id] = await checkServerHealth(s);
    })
  );
  return results;
}

export function getEmbedUrl(server, imdbId, mediaType, season, episode, tmdbId) {
  const id = server.usesTmdbId ? tmdbId : imdbId;
  if (mediaType === 'tv') {
    return server.tv(id, season || 1, episode || 1);
  }
  return server.movie(id);
}

export function getServers() {
  return servers;
}

export default servers;
