import { useHorizontalScroll } from '../hooks/useHorizontalScroll';
import { useCardHover } from '../hooks/useCardHover';
import { useDevice } from '../hooks/useDevice';
import MediaCard from './MediaCard';
import { SkeletonRow } from './Skeleton';

export default function ScrollRow({ title, items = [], loading, showRank = false }) {
  const { ref, showLeft, showRight, scrollLeft, scrollRight } = useHorizontalScroll();
  const { hoveredIndex, onEnter, onLeave } = useCardHover(450);
  const { isTV } = useDevice();

  return (
    <section className="scroll-row">
      <div className="scroll-row-header">
        <h2 className="scroll-row-title">{title}</h2>
      </div>
      {loading ? (
        <SkeletonRow count={isTV ? 8 : 6} />
      ) : (
        <div className="scroll-row-container">
          {showLeft && (
            <button
              className="scroll-arrow scroll-arrow-left"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              ‹
            </button>
          )}
          <div ref={ref} className="scroll-row-content">
            {items.map((item, i) => (
              <MediaCard
                key={item.id}
                item={item}
                index={showRank ? i : undefined}
                showRank={showRank}
                inRow
                isHovered={hoveredIndex === i}
                isNeighbor={hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1}
                neighborDirection={hoveredIndex !== null && i < hoveredIndex ? 'left' : 'right'}
                onHoverEnter={onEnter}
                onHoverLeave={onLeave}
              />
            ))}
          </div>
          {showRight && (
            <button
              className="scroll-arrow scroll-arrow-right"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              ›
            </button>
          )}
        </div>
      )}
    </section>
  );
}
