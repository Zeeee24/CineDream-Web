const servers = [
  {
    id: 'vidsrc-icu',
    name: 'VidSrc.icu',
    movie: (id) => `https://vidsrc.icu/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.icu',
  },
  {
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    movie: (id) => `https://vidsrc.me/embed/movie?imdb=${id}`,
    tv: (id, season, episode) => `https://vidsrc.me/embed/tv?imdb=${id}&season=${season}&episode=${episode}`,
    healthCheck: 'https://vidsrc.me',
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc.cc',
    movie: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.cc',
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    movie: (id) => `https://multiembed.mov/?video_id=${id}`,
    tv: (id, season, episode) => `https://multiembed.mov/?video_id=${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://multiembed.mov',
  },
  {
    id: '2embed',
    name: '2Embed',
    movie: (id) => `https://www.2embed.cc/embed/${id}`,
    tv: (id, season, episode) => `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
    healthCheck: 'https://www.2embed.cc',
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    movie: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tv: (id, season, episode) => `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://player.autoembed.cc',
  },
  {
    id: 'filme',
    name: 'FilmU',
    movie: (id) => `https://embed.filme.in/movie/${id}`,
    tv: (id, season, episode) => `https://embed.filme.in/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://embed.filme.in',
  },
  {
    id: 'vidbinge',
    name: 'VidBinge',
    movie: (id) => `https://vidbinge.to/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidbinge.to/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidbinge.to',
  },
  {
    id: 'vidsrc-mov',
    name: 'VidSrc.mov',
    movie: (id) => `https://vidsrc.mov/embed/movie/${id}`,
    tv: (id, season, episode) => `https://vidsrc.mov/embed/tv/${id}/${season}/${episode}`,
    healthCheck: 'https://vidsrc.mov',
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

export function getEmbedUrl(server, imdbId, mediaType, season, episode) {
  if (mediaType === 'tv') {
    return server.tv(imdbId, season || 1, episode || 1);
  }
  return server.movie(imdbId);
}

export function getServers() {
  return servers;
}

export default servers;
