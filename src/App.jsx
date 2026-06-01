import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Browse from './pages/Browse';
import Detail from './pages/Detail';

export default function App() {
  return (
    <BrowserRouter basename="/Cinedream">
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/:type/:id" element={<Detail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="empty-page">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="/Cinedream/" className="btn btn-primary">Go Home</a>
    </div>
  );
}
