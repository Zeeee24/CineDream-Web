export function SkeletonCard({ width = '100%', height = 260, borderRadius = 8 }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0 }}
    />
  );
}

export function SkeletonRow({ count = 6, cardWidth = 160, gap = 12 }) {
  return (
    <div style={{ display: 'flex', gap, padding: '0 20px', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} width={cardWidth} height={cardWidth * 1.5} />
      ))}
    </div>
  );
}

export function SkeletonHero() {
  return <div className="skeleton skeleton-hero" />;
}

export function SkeletonGrid({ count = 10 }) {
  return (
    <div className="content-grid skeleton-grid-animate">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={260} />
      ))}
    </div>
  );
}

export function SkeletonDetailInfo() {
  return (
    <div className="detail-info-side" style={{ animation: 'none' }}>
      <div className="skeleton" style={{ width: '70%', height: 36, borderRadius: 6, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '40%', height: 18, borderRadius: 4, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div className="skeleton" style={{ width: 60, height: 26, borderRadius: 20 }} />
        <div className="skeleton" style={{ width: 60, height: 26, borderRadius: 20 }} />
        <div className="skeleton" style={{ width: 60, height: 26, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '75%', height: 14, borderRadius: 4, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="skeleton" style={{ width: 120, height: 44, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 22 }} />
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 22 }} />
      </div>
    </div>
  );
}

export function SkeletonCast() {
  return (
    <div style={{ display: 'flex', gap: 16, overflow: 'hidden', padding: '0 var(--content-padding)' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ flexShrink: 0, textAlign: 'center', width: 100 }}>
          <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: '80%', height: 12, borderRadius: 4, margin: '0 auto 4px' }} />
          <div className="skeleton" style={{ width: '60%', height: 10, borderRadius: 4, margin: '0 auto' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonActorPage() {
  return (
    <div className="actor-page">
      <div className="back-button" style={{ position: 'relative', top: 0, left: 0, margin: '0 0 16px', opacity: 0.3 }} />
      <div className="actor-hero">
        <div className="skeleton" style={{ width: 260, height: 360, borderRadius: 12, flexShrink: 0 }} />
        <div className="actor-info" style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '50%', height: 36, borderRadius: 6, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '30%', height: 16, borderRadius: 4, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '70%', height: 14, borderRadius: 4 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 160, height: 24, borderRadius: 6, marginBottom: 16 }} />
      <div className="content-grid skeleton-grid-animate">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} height={260} />
        ))}
      </div>
    </div>
  );
}
