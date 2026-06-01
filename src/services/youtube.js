export function getYouTubeEmbedUrl(key, opts = {}) {
  const params = new URLSearchParams({
    autoplay: opts.autoplay ? '1' : '0',
    mute: opts.mute ? '1' : '0',
    controls: opts.controls !== false ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    ...opts.extra,
  });
  return `https://www.youtube.com/embed/${key}?${params.toString()}`;
}

export function getYouTubeThumbnail(key, quality = 'maxresdefault') {
  return `https://img.youtube.com/vi/${key}/${quality}.jpg`;
}

export function getYouTubeWatchUrl(key) {
  return `https://www.youtube.com/watch?v=${key}`;
}
