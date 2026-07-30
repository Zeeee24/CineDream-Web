import { useState, useEffect, useMemo } from 'react';
import { getTVSeason, img } from '../services/tmdb';
import { isEpisodeWatched, toggleEpisodeWatched, getEpisodeProgress } from '../services/watchHistory';

export default function EpisodeGrid({ tvId, seasons, onPlayEpisode }) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [watchTick, setWatchTick] = useState(0);

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

  function handleToggleWatched(ep) {
    toggleEpisodeWatched(tvId, selectedSeason, ep.episode_number);
    setWatchTick((t) => t + 1);
  }

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
          {episodes.map((ep) => {
            const watched = isEpisodeWatched(tvId, selectedSeason, ep.episode_number);
            const progress = getEpisodeProgress(tvId, selectedSeason, ep.episode_number);
            const progressPct = progress && progress.durationSeconds > 0
              ? Math.min((progress.progressSeconds / progress.durationSeconds) * 100, 100)
              : 0;
            const airYear = ep.air_date ? ep.air_date.slice(0, 4) : null;

            return (
              <div
                key={ep.id}
                className={`episode-card ${watched ? 'episode-watched' : ''}`}
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
                  {watched && (
                    <div className="episode-watched-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  {progressPct > 0 && !watched && (
                    <div className="episode-progress-bar">
                      <div className="episode-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}
                </div>
                <div className="episode-info">
                  <div className="episode-title-row">
                    <span className="episode-title">{ep.name || `Episode ${ep.episode_number}`}</span>
                    <button
                      className="episode-watched-btn"
                      onClick={(e) => { e.stopPropagation(); handleToggleWatched(ep); }}
                      aria-label={watched ? 'Mark as unwatched' : 'Mark as watched'}
                      title={watched ? 'Mark as unwatched' : 'Mark as watched'}
                    >
                      {watched ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#46d369" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="episode-meta">
                    {airYear && <span>{airYear}</span>}
                    {ep.runtime && <span>{ep.runtime}m</span>}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
