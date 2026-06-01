const servers = [
  {
    id: 'cinezo',
    name: 'Server 1 — Cinezo',
    label: 'HD',
    movie: (id) => `https://player.cinezo.live/embed/movie/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://player.cinezo.live/embed/tv/${id}/${season}/${episode}?ref=zeeee24.github.io`,
    healthCheck: 'https://player.cinezo.live',
    usesTmdbId: false,
  },
  {
    id: 'ezvidapi',
    name: 'Server 2 — EzVid',
    label: 'HD',
    movie: (id) => `https://ezvidapi.com/embed/movie/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://ezvidapi.com/embed/tv/${id}/${season}/${episode}?ref=zeeee24.github.io`,
    healthCheck: 'https://ezvidapi.com',
    usesTmdbId: true,
  },
  {
    id: 'multiembed',
    name: 'Server 3 — MultiEmbed',
    label: 'VIP',
    movie: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1&ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}&ref=zeeee24.github.io`,
    healthCheck: 'https://multiembed.mov',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-me',
    name: 'Server 4 — VidSrc.me',
    label: 'HD',
    movie: (id) => `https://vidsrc.me/embed/movie/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://vidsrc.me/embed/tv/${id}/${season}/${episode}?ref=zeeee24.github.io`,
    healthCheck: 'https://vidsrc.me',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-fyi',
    name: 'Server 5 — VidSrc.fyi',
    label: 'HD',
    movie: (id) => `https://vidsrc.fyi/embed/movie/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://vidsrc.fyi/embed/tv/${id}/${season}/${episode}?ref=zeeee24.github.io`,
    healthCheck: 'https://vidsrc.fyi',
    usesTmdbId: true,
  },
  {
    id: '2embed',
    name: 'Server 6 — 2Embed',
    label: 'SD',
    movie: (id) => `https://www.2embed.cc/embed/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}&ref=zeeee24.github.io`,
    healthCheck: 'https://www.2embed.cc',
    usesTmdbId: true,
  },
  {
    id: 'superembed',
    name: 'Server 7 — SuperEmbed',
    label: 'SD',
    movie: (id) => `https://www.superembed.stream/embed/movie/${id}?ref=zeeee24.github.io`,
    tv: (id, season, episode) => `https://www.superembed.stream/embed/tv/${id}/${season}/${episode}?ref=zeeee24.github.io`,
    healthCheck: 'https://www.superembed.stream',
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
    serverHealth[server.id] = false;
    return false;
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
  let url = '';
  if (mediaType === 'tv') {
    url = server.tv(id, season || 1, episode || 1);
  } else {
    url = server.movie(id);
  }
  
  if (url && !url.includes('ref=zeeee24.github.io')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}ref=zeeee24.github.io`;
  }
  return url;
}

export function getServers() {
  return servers;
}

export default servers;
