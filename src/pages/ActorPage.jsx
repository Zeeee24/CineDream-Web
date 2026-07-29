import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { getPersonDetails, getPersonCredits, img } from '../services/tmdb';
import { SkeletonActorPage } from '../components/Skeleton';

export default function ActorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pData, cData] = await Promise.all([
          getPersonDetails(id),
          getPersonCredits(id),
        ]);
        setPerson(pData);
        const sorted = (cData.cast || []).sort((a, b) => {
          const ya = a.release_date || a.first_air_date || '0000';
          const yb = b.release_date || b.first_air_date || '0000';
          return yb.localeCompare(ya);
        });
        setCredits(sorted);
      } catch (err) {
        console.error('Failed to load actor:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading || !person) {
    return (
      <div className="detail-page">
        <SkeletonActorPage />
      </div>
    );
  }

  const profileUrl = img.profile(person.profile_path, 'h632');
  const knownFor = person.known_for_department || 'Acting';

  return (
    <div className="detail-page">
      <div className="actor-page">
        <BackButton />

        <div className="actor-hero">
          {profileUrl ? (
            <img src={profileUrl} alt={person.name} className="actor-photo" />
          ) : (
            <div className="actor-photo actor-photo-placeholder" />
          )}
          <div className="actor-info">
            <h1 className="actor-name">{person.name}</h1>
            <div className="actor-meta">
              {person.known_for_department && <span>{knownFor}</span>}
              {person.birthday && <span>Born {person.birthday}{person.deathday ? ` — Died ${person.deathday}` : ''}</span>}
              {person.place_of_birth && <span>{person.place_of_birth}</span>}
            </div>
            {person.biography && (
              <p className="actor-bio">{person.biography}</p>
            )}
          </div>
        </div>

        {credits.length > 0 && (
          <section className="actor-filmography">
            <h2 className="section-title">Filmography</h2>
            <div className="content-grid">
              {credits.map((item) => {
                const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
                const title = item.title || item.name;
                const year = (item.release_date || item.first_air_date || '').slice(0, 4);
                const posterUrl = img.poster(item.poster_path, 'w342');
                return (
                  <div
                    key={item.credit_id}
                    className="media-card"
                    onClick={() => navigate(`/${mediaType}/${item.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/${mediaType}/${item.id}`);
                      }
                    }}
                  >
                    <div className="card-poster-wrapper">
                      {posterUrl ? (
                        <img src={posterUrl} alt={title} className="card-poster" loading="lazy" />
                      ) : (
                        <div className="card-poster skeleton" />
                      )}
                      <div className="card-overlay">
                        {item.vote_average > 0 && (
                          <div className="card-rating">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span>{item.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                        <div className="card-year">{year}</div>
                      </div>
                    </div>
                    <div className="card-title">{title}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
