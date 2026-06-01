import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Browse from './pages/Browse';
import Detail from './pages/Detail';

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/:type/:id" element={<Detail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/CineDream-Web">
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="empty-page">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="/CineDream-Web/" className="btn btn-primary">Go Home</a>
    </div>
  );
}
