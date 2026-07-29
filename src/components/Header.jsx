import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import logo from '../assets/logo.png';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isTV } = useDevice();
  const { isLoggedIn, userProfile, logOut } = useAuth();
  const userMenuRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/browse', label: 'Browse' },
  ];

  function handleKeyDown(e) {
    if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
  }

  const initials = userProfile?.displayName
    ? userProfile.displayName.charAt(0).toUpperCase()
    : userProfile?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`} onKeyDown={handleKeyDown}>
        <div className="header-inner">
        <NavLink to="/" className="header-logo">
          <img src={logo} alt="CineDream Logo" className="logo-icon" />
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

          <div className="header-right">
            {isLoggedIn ? (
              <div className="user-menu-wrapper" ref={userMenuRef}>
                <button
                  className="user-avatar-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="" className="user-avatar-img" />
                  ) : (
                    <span className="user-avatar-initials">{initials}</span>
                  )}
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-info">
                      <span className="user-dropdown-name">{userProfile?.displayName || 'User'}</span>
                      <span className="user-dropdown-email">{userProfile?.email}</span>
                    </div>
                    <div className="user-dropdown-divider" />
                    <button className="user-dropdown-item" onClick={() => { logOut(); setUserMenuOpen(false); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="auth-sign-in-btn" onClick={() => setAuthOpen(true)}>
                Sign In
              </button>
            )}

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
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
