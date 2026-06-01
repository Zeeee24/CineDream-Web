const servers = [
  {
    id: 'letsembed',
    name: "Let's Embed",
    movie: (id) => `https://letsembed.cc/embed/movie/?id=${id}`,
    tv: (id, season, episode) => `https://letsembed.cc/embed/tv/?id=${id}/${season}/${episode}`,
    healthCheck: 'https://letsembed.cc',
    usesTmdbId: true,
  },
  {
    id: 'cinezo',
    name: 'Cinezo',
    movie: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    tv: (id, season, episode) => `https://player.cinezo.live/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.cinezo.live',
    usesTmdbId: true,
  },
  {
    id: 'ezvidapi',
    name: 'EzVidAPI',
    movie: (id) => `https://ezvidapi.com/embed/movie/${id}`,
    tv: (id, season, episode) => `https://ezvidapi.com/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://ezvidapi.com',
    usesTmdbId: true,
  },
  {
    id: 'embed-api',
    name: 'Embed API',
    movie: (id) => `https://player.embed-api.stream/?id=${id}`,
    tv: (id, season, episode) => `https://player.embed-api.stream/?id=${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://player.embed-api.stream',
    usesTmdbId: true,
  },
  {
    id: 'superembed',
    name: 'SuperEmbed',
    movie: (id) => `https://www.superembed.stream/embed/movie/${id}`,
    tv: (id, season, episode) => `https://www.superembed.stream/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://www.superembed.stream',
    usesTmdbId: true,
  },
  {
    id: 'vidsrc-icu',
    name: 'VidSrc.icu',
    movie: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.icu',
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc.cc',
    movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.cc',
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tv: (id, season, episode) => `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.autoembed.cc',
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    movie: (id) => `https://multiembed.mov/?video_id=${id}`,
    tv: (id, season, episode) => `https://multiembed.mov/?video_id=${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://multiembed.mov',
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
  if (mediaType === 'tv') {
    return server.tv(id, season || 1, episode || 1);
  }
  return server.movie(id);
}

export function getServers() {
  return servers;
}

export default servers;
