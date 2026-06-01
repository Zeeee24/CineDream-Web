export function formatRuntime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDetailInfo(year, rating, runtime, ageRating) {
  const parts = [];
  if (year) parts.push(String(year));
  if (ageRating) parts.push(ageRating);
  if (runtime) parts.push(formatRuntime(runtime));
  return parts.join(' \u2022 ');
}

export function getYear(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).getFullYear();
}

export function truncate(str, len = 200) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len).trimEnd() + '...';
}

export function getCertification(content_ratings) {
  if (!content_ratings?.results) return null;
  const us = content_ratings.results.find((r) => r.iso_3166_1 === 'US');
  const inr = content_ratings.results.find((r) => r.iso_3166_1 === 'IN');
  return us?.certification || inr?.certification || null;
}

export function getTVCertification(content_ratings) {
  if (!content_ratings?.results) return null;
  const us = content_ratings.results.find((r) => r.iso_3166_1 === 'US');
  return us?.rating || null;
}
