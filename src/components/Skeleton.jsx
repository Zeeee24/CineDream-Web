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

export function SkeletonGrid({ count = 10, cols = 4 }) {
  return (
    <div
      className="content-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        padding: '0 20px',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={260} />
      ))}
    </div>
  );
}
