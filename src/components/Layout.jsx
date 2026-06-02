import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Header />
      <main id="main-content" className="main" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  );
}
