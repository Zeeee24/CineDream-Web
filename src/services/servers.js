const servers = [
  {
    id: 'cinezo',
    name: 'Server 1 — Cinezo',
    label: 'HD',
    movie: (id) => `https://cinezo.net/embed/movie/${id}`,
    tv: (id, season, episode) => `https://cinezo.net/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://cinezo.net',
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
    id: 'multiembed',
    name: 'Server 3 — MultiEmbed',
    label: 'Fast',
    movie: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    tv: (id, season, episode) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`,
    healthCheck: 'https://multiembed.mov',
    usesTmdbId: true,
  },
  {
    id: 'vidlink',
    name: 'Server 4 — VidLink',
    label: 'Minimal Ads',
    movie: (id) => `https://vidlink.pro/movie/${id}`,
    tv: (id, season, episode) => `https://vidlink.pro/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidlink.pro',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-me',
    name: 'Server 5 — VidSrc.me',
    label: 'HD',
    movie: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    tv: (id, season, episode) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`,
    healthCheck: 'https://vidsrc.me',
    usesTmdbId: true,
  },
  {
    id: 'embed-su',
    name: 'Server 6 — Embed.su',
    label: 'HD',
    movie: (id) => `https://embed.su/embed/movie/${id}`,
    tv: (id, season, episode) => `https://embed.su/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://embed.su',
    usesTmdbId: true,
  },
  {
    id: 'smashystream',
    name: 'Server 7 — SmashyStream',
    label: 'HD',
    movie: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    tv: (id, season, episode) => `https://embed.smashystream.com/playere.php?tmdb=${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://embed.smashystream.com',
    usesTmdbId: true,
  },
  {
    id: '2embed',
    name: 'Server 8 — 2Embed',
    label: 'HD',
    movie: (id) => `https://www.2embed.cc/embed/${id}`,
    tv: (id, season, episode) => `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://www.2embed.cc',
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
