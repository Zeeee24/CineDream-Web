import { useState, useEffect } from 'react';
import { getTVSeason, img } from '../services/tmdb';

export default function EpisodeGrid({ tvId, seasons, onPlayEpisode }) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const validSeasons = (seasons || []).filter((s) => s.season_number > 0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getTVSeason(tvId, selectedSeason);
        if (!cancelled) setEpisodes(data.episodes || []);
      } catch {
        if (!cancelled) {
          setEpisodes([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tvId, selectedSeason]);

  return (
    <div className="episode-section">
      <div className="episode-header">
        <div className="episode-header-left">
          <h2 className="section-title">Episodes</h2>
          <div className="season-select-wrapper">
            <select
              className="season-select"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(Number(e.target.value))}
            >
              {validSeasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  Season {s.season_number}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="episode-loading">
          <div className="player-loading-spinner" />
        </div>
      ) : error ? (
        <div className="episode-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <p>Failed to load episodes</p>
          <button className="btn btn-secondary" onClick={() => setSelectedSeason(selectedSeason)} style={{ fontSize: '0.8rem', padding: '6px 16px' }}>
            Retry
          </button>
        </div>
      ) : (
        <div className="episode-list">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="episode-card"
              onClick={() => onPlayEpisode(selectedSeason, ep.episode_number)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPlayEpisode(selectedSeason, ep.episode_number);
                }
              }}
            >
              <div className="episode-thumb-wrapper">
                {ep.still_path ? (
                  <img
                    src={img.backdrop(ep.still_path, 'w300')}
                    alt={`S${selectedSeason}E${ep.episode_number}`}
                    className="episode-thumb"
                    loading="lazy"
                  />
                ) : (
                  <div className="episode-thumb episode-thumb-placeholder" />
                )}
                <div className="episode-play-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="episode-number">{ep.episode_number}</span>
              </div>
              <div className="episode-info">
                <div className="episode-title">{ep.name || `Episode ${ep.episode_number}`}</div>
                <div className="episode-meta">
                  {ep.air_date && <span>{ep.air_date.slice(0, 4)}</span>}
                  {ep.vote_average > 0 && (
                    <span className="episode-rating">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {ep.vote_average.toFixed(1)}
                    </span>
                  )}
                </div>
                {ep.overview && (
                  <p className="episode-overview">{ep.overview}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
