import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getMovieDetails, getTVDetails, img } from '../services/tmdb';
import { formatDetailInfo, getYear, getCertification, getTVCertification, truncate } from '../utils/helpers';
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from '../services/youtube';
import { useDevice } from '../hooks/useDevice';
import ScrollRow from '../components/ScrollRow';
import TrailerModal from '../components/TrailerModal';
import { SkeletonHero } from '../components/Skeleton';

export default function Detail() {
  const { type, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isTV } = useDevice();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  const isMovie = type === 'movie';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const details = isMovie ? await getMovieDetails(id) : await getTVDetails(id);
        setData(details);
        if (searchParams.get('autoplay') === 'true') {
          setShowTrailer(true);
        }
      } catch (err) {
        console.error('Failed to load details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
  }, [type, id, isMovie, searchParams]);

  if (loading || !data) {
    return (
      <div className="detail-page">
        <SkeletonHero />
      </div>
    );
  }

  const title = data.title || data.name || '';
  const backdropUrl = img.backdrop(data.backdrop_path, 'original');
  const posterUrl = img.poster(data.poster_path, isTV ? 'w500' : 'w342');
  const year = getYear(data.release_date || data.first_air_date);
  const runtime = data.runtime || null;
  const cert = isMovie ? getCertification(data.content_ratings) : getTVCertification(data.content_ratings);
  const rating = data.vote_average ? data.vote_average.toFixed(1) : null;
  const genres = data.genres || [];
  const cast = data.credits?.cast?.slice(0, 12) || [];
  const similar = data.similar?.results || data.recommendations?.results || [];
  const videos = data.videos?.results || [];
  const trailerKey = videos.find(
    (v) => v.type === 'Trailer' && v.site === 'YouTube'
  )?.key || videos.find((v) => v.site === 'YouTube')?.key || null;

  const infoLine = formatDetailInfo(year, rating, runtime, cert);
  const seasons = data.seasons || [];

  function handlePlayNow() {
    setShowTrailer(true);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlayNow();
    }
  }

  return (
    <div className="detail-page">
      <div className="detail-backdrop-wrapper">
        {backdropUrl && (
          <img src={backdropUrl} alt="" className="detail-backdrop" />
        )}
        <div className="detail-backdrop-gradient" />
      </div>

      <div className="detail-content">
        <div className="detail-top">
          <div className="detail-poster-side">
            {posterUrl && (
              <img src={posterUrl} alt={title} className="detail-poster" />
            )}
          </div>
          <div className="detail-info-side">
            <h1 className="detail-title">{title}</h1>
            <div className="detail-meta">{infoLine}</div>
            <div className="detail-genres">
              {genres.map((g) => (
                <span key={g.id} className="genre-tag">{g.name}</span>
              ))}
            </div>
            {data.tagline && <p className="detail-tagline">"{data.tagline}"</p>}
            <p className="detail-overview">{data.overview}</p>

            {isTV && seasons.length > 0 && (
              <div className="detail-episodes">
                <div className="episode-selectors">
                  <select
                    className="season-select"
                    value={selectedSeason}
                    onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); }}
                  >
                    {seasons.filter(s => s.season_number > 0).map((s) => (
                      <option key={s.id} value={s.season_number}>
                        Season {s.season_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="detail-actions">
              <button
                className="btn btn-primary btn-large"
                onClick={handlePlayNow}
                onKeyDown={isTV ? handleKeyDown : undefined}
                tabIndex={isTV ? 0 : undefined}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play Now
              </button>
            </div>
          </div>
        </div>

        {trailerKey && (
          <section className="detail-trailer-section">
            <h2 className="section-title">Trailer</h2>
            <div className="trailer-preview" onClick={() => setShowTrailer(true)}>
              <img
                src={getYouTubeThumbnail(trailerKey)}
                alt="Trailer thumbnail"
                className="trailer-thumbnail"
                loading="lazy"
              />
              <div className="trailer-play-overlay">
                <div className="trailer-play-btn">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}

        {cast.length > 0 && (
          <section className="detail-cast-section">
            <h2 className="section-title">Cast</h2>
            <div className="cast-row">
              {cast.map((person) => {
                const profileUrl = img.profile(person.profile_path);
                return (
                  <div key={person.id} className="cast-card">
                    {profileUrl ? (
                      <img src={profileUrl} alt={person.name} className="cast-photo" loading="lazy" />
                    ) : (
                      <div className="cast-photo cast-placeholder" />
                    )}
                    <div className="cast-name">{person.name}</div>
                    <div className="cast-character">{person.character}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {similar.length > 0 && (
          <ScrollRow title="More Like This" items={similar} />
        )}
      </div>

      {showTrailer && (
        <TrailerModal videoKey={trailerKey} onClose={() => setShowTrailer(false)} />
      )}
    </div>
  );
}
