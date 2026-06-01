import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isTV } = useDevice();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/browse', label: 'Browse' },
  ];

  function handleKeyDown(e) {
    if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
  }

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`} onKeyDown={handleKeyDown}>
      <div className="header-inner">
        <NavLink to="/" className="header-logo">
          <span className="logo-icon">C</span>
          <span className="logo-text">CineDream</span>
        </NavLink>

        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''} ${isTV ? 'tv-focusable' : ''}`
              }
              onClick={() => setMenuOpen(false)}
              end={link.to === '/'}
              tabIndex={isTV ? 0 : undefined}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="header-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
