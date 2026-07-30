import { useState, useEffect, useMemo } from 'react';
import HeroBanner from '../components/HeroBanner';
import ScrollRow from '../components/ScrollRow';
import MediaCard from '../components/MediaCard';
import {
  getTrending,
  getTrendingMovies,
  getTrendingTV,
  getTop10Movies,
  getTop10TV,
  getRecentlyAdded,
  getBollywood,
  getMovieDetails,
  getTVDetails,
  discoverByGenre,
  discoverByRuntime,
  getDiscoverByProvider,
} from '../services/tmdb';
import { getContinueWatching, getRecentlyViewed, removeFromHistory } from '../services/watchHistory';
import { getWatchlist } from '../services/watchlist';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    hero: [],
    trendingMovies: [],
    trendingTV: [],
    top10Movies: [],
    top10TV: [],
    recentlyAdded: [],
    bollywood: [],
    darkThrillers: [],
    under90Minutes: [],
    netflixOriginals: [],
    primeVideo: [],
    disneyPlus: [],
    hboMax: [],
  });
  const [historyTick, setHistoryTick] = useState(0);

  const continueWatching = useMemo(() => getContinueWatching(), [historyTick]);
  const recentlyViewed = useMemo(() => getRecentlyViewed(), [historyTick]);
  const [myListItems, setMyListItems] = useState([]);

  useEffect(() => {
    async function loadMyList() {
      const list = getWatchlist();
      const enriched = await Promise.all(
        list.slice(0, 20).map(async (item) => {
          try {
            const details = item.mediaType === 'tv'
              ? await getTVDetails(item.tmdbId)
              : await getMovieDetails(item.tmdbId);
            return {
              id: item.tmdbId,
              media_type: item.mediaType,
              title: details.title || details.name || item.title,
              poster_path: details.poster_path || item.posterPath,
              backdrop_path: details.backdrop_path || item.backdropPath,
              vote_average: details.vote_average || 0,
              release_date: details.release_date,
              first_air_date: details.first_air_date,
              overview: details.overview || '',
            };
          } catch {
            return {
              id: item.tmdbId,
              media_type: item.mediaType,
              title: item.title,
              poster_path: item.posterPath,
              backdrop_path: item.backdropPath,
              vote_average: 0,
              overview: '',
            };
          }
        })
      );
      setMyListItems(enriched);
    }
    loadMyList();
  }, [historyTick]);

  useEffect(() => {
    function handleStorage() {
      setHistoryTick((t) => t + 1);
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [hero, tm, tv, t10m, t10tv, ra, bo, thrillers, short, netflix, prime, disney, hbo] = await Promise.allSettled([
          getTrending(),
          getTrendingMovies(),
          getTrendingTV(),
          getTop10Movies(),
          getTop10TV(),
          getRecentlyAdded(),
          getBollywood(),
          discoverByGenre([53, 9648, 80], { 'vote_count.gte': 300 }),
          discoverByRuntime({ with_runtime_lte: 90, 'vote_count.gte': 200 }),
          getDiscoverByProvider(8),
          getDiscoverByProvider(9),
          getDiscoverByProvider(337),
          getDiscoverByProvider(384),
        ]);

        const unwrap = (r) => r.status === 'fulfilled' ? (r.value?.results || []) : [];

        setData({
          hero: unwrap(hero),
          trendingMovies: unwrap(tm),
          trendingTV: unwrap(tv),
          top10Movies: unwrap(t10m),
          top10TV: unwrap(t10tv),
          recentlyAdded: unwrap(ra),
          bollywood: unwrap(bo),
          darkThrillers: unwrap(thrillers),
          under90Minutes: unwrap(short),
          netflixOriginals: unwrap(netflix),
          primeVideo: unwrap(prime),
          disneyPlus: unwrap(disney),
          hboMax: unwrap(hbo),
        });
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
        setHistoryTick((t) => t + 1);
      }
    }
    load();
  }, []);

  function handleRemoveFromHistory(tmdbId) {
    removeFromHistory(tmdbId);
    setHistoryTick((t) => t + 1);
  }

  return (
    <div className="home-page">
      <HeroBanner items={data.hero} />
      <div className="home-rows">
        {myListItems.length > 0 && (
          <ScrollRow title="My List" items={myListItems} />
        )}

        {continueWatching.length > 0 && (
          <div className="scroll-row">
            <div className="scroll-row-header">
              <h2 className="scroll-row-title">Continue Watching</h2>
            </div>
            <div className="scroll-row-container">
              <div className="scroll-row-content">
                {continueWatching.map((item) => {
                  const remaining = item.durationSeconds - item.progressSeconds;
                  const remainingMin = Math.max(0, Math.round(remaining / 60));
                  return (
                    <MediaCard
                      key={item.tmdbId}
                      item={{
                        id: item.tmdbId,
                        media_type: item.contentType === 'TV' ? 'tv' : 'movie',
                        title: item.title,
                        poster_path: item.posterPath,
                        vote_average: 0,
                      }}
                      progress={item}
                      onLongPress={handleRemoveFromHistory}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <ScrollRow title="Trending Movies" items={data.trendingMovies} loading={loading} />
        <ScrollRow title="Trending TV Shows" items={data.trendingTV} loading={loading} />

        {recentlyViewed.length > 0 && (
          <div className="scroll-row">
            <div className="scroll-row-header">
              <h2 className="scroll-row-title">Recently Viewed</h2>
            </div>
            <div className="scroll-row-container">
              <div className="scroll-row-content">
                {recentlyViewed.map((item) => (
                  <MediaCard
                    key={item.tmdbId}
                    item={{
                      id: item.tmdbId,
                      media_type: item.contentType === 'TV' ? 'tv' : 'movie',
                      title: item.title,
                      poster_path: item.posterPath,
                      vote_average: 0,
                    }}
                    progress={item.progressSeconds > 0 ? item : null}
                    onLongPress={handleRemoveFromHistory}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <ScrollRow title="Top 10 Movies Today" items={data.top10Movies} loading={loading} showRank />
        <ScrollRow title="Top 10 TV Shows Today" items={data.top10TV} loading={loading} showRank />

        {data.netflixOriginals.length > 0 && (
          <ScrollRow title="On Netflix" items={data.netflixOriginals} loading={loading} />
        )}
        {data.primeVideo.length > 0 && (
          <ScrollRow title="On Prime Video" items={data.primeVideo} loading={loading} />
        )}
        {data.disneyPlus.length > 0 && (
          <ScrollRow title="On Disney+" items={data.disneyPlus} loading={loading} />
        )}
        {data.hboMax.length > 0 && (
          <ScrollRow title="On Max" items={data.hboMax} loading={loading} />
        )}

        {data.darkThrillers.length > 0 && (
          <ScrollRow title="Dark Thrillers" items={data.darkThrillers} loading={loading} />
        )}
        {data.under90Minutes.length > 0 && (
          <ScrollRow title="Quick Watches — Under 90 Minutes" items={data.under90Minutes} loading={loading} />
        )}

        <ScrollRow title="Recently Added" items={data.recentlyAdded} loading={loading} />
        <ScrollRow title="Bollywood" items={data.bollywood} loading={loading} />
      </div>
    </div>
  );
}
