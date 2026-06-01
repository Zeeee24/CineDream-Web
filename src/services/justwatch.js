import axios from 'axios';

export async function getProviders(tmdbId, mediaType = 'movie', country = 'IN') {
  try {
    const { data } = await axios.get(
      `https://apis.justwatch.com/content/titles/${mediaType}/${tmdbId}/offers`,
      { params: { country } }
    );
    if (!data?.providers) return [];
    const unique = new Map();
    for (const p of data.providers) {
      if (!unique.has(p.provider_id)) {
        unique.set(p.provider_id, {
          id: p.provider_id,
          name: p.monetization_type,
          url: p.url,
        });
      }
    }
    return Array.from(unique.values());
  } catch {
    return [];
  }
}
