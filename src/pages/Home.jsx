import { useState, useEffect } from 'react';
import HeroBanner from '../components/HeroBanner';
import ScrollRow from '../components/ScrollRow';
import {
  getTrending,
  getTrendingMovies,
  getTrendingTV,
  getTop10Movies,
  getTop10TV,
  getRecentlyAdded,
  getBollywood,
} from '../services/tmdb';

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
      }
    }
    load();
  }, []);

  return (
    <div className="home-page">
      <HeroBanner items={data.hero} />
      <div className="home-rows">
        <ScrollRow title="Trending Movies" items={data.trendingMovies} loading={loading} />
        <ScrollRow title="Trending TV Shows" items={data.trendingTV} loading={loading} />
        <ScrollRow title="Top 10 Movies Today" items={data.top10Movies} loading={loading} showRank />
        <ScrollRow title="Top 10 TV Shows Today" items={data.top10TV} loading={loading} showRank />
        <ScrollRow title="Recently Added" items={data.recentlyAdded} loading={loading} />
        <ScrollRow title="Bollywood" items={data.bollywood} loading={loading} />
      </div>
    </div>
  );
}
