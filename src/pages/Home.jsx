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
} from '../services/tmdb';
import { getContinueWatching, getRecentlyViewed } from '../services/watchHistory';
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
        const [hero, tm, tv, t10m, t10tv, ra, bo] = await Promise.all([
          getTrending(),
          getTrendingMovies(),
          getTrendingTV(),
          getTop10Movies(),
          getTop10TV(),
          getRecentlyAdded(),
          getBollywood(),
        ]);
        setData({
          hero: hero.results || [],
          trendingMovies: tm.results || [],
          trendingTV: tv.results || [],
          top10Movies: t10m.results || [],
          top10TV: t10tv.results || [],
          recentlyAdded: ra.results || [],
          bollywood: bo.results || [],
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
                {continueWatching.map((item) => (
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
                  />
                ))}
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
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <ScrollRow title="Top 10 Movies Today" items={data.top10Movies} loading={loading} showRank />
        <ScrollRow title="Top 10 TV Shows Today" items={data.top10TV} loading={loading} showRank />
        <ScrollRow title="Recently Added" items={data.recentlyAdded} loading={loading} />
        <ScrollRow title="Bollywood" items={data.bollywood} loading={loading} />
      </div>
    </div>
  );
}
