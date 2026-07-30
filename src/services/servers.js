const servers = [
  {
    id: 'vidlink',
    name: 'Server 1 — VidLink',
    label: 'Clean HD',
    movie: (id) => `https://vidlink.pro/movie/${id}?primaryColor=e50914&secondaryColor=141414`,
    tv: (id, season, episode) => `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=e50914&secondaryColor=141414`,
    healthCheck: 'https://vidlink.pro',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-to',
    name: 'Server 2 — VidSrc.to',
    label: 'HD',
    movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.to',
    usesTmdbId: true,
  },
  {
    id: 'videasy',
    name: 'Server 3 — Videasy',
    label: 'HD',
    movie: (id) => `https://player.videasy.net/movie/${id}`,
    tv: (id, season, episode) => `https://player.videasy.net/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.videasy.net',
    usesTmdbId: true,
  },
  {
    id: '111movies',
    name: 'Server 4 — 111Movies',
    label: 'Fast',
    movie: (id) => `https://111movies.com/movie/${id}`,
    tv: (id, season, episode) => `https://111movies.com/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://111movies.com',
    usesTmdbId: true,
  },
  {
    id: 'autoembed',
    name: 'Server 5 — AutoEmbed',
    label: 'Backup',
    movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tv: (id, season, episode) => `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.autoembed.cc',
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
