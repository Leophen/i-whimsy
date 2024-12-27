import { Routes, Route } from 'react-router-dom';
import BlogDetail from './pages/BlogPages/BlogDetail';
import BlogList from './pages/BlogPages/BlogList';
import ErrorPage from './pages/BlogPages/ErrorPage';
import './style/index.scss';
import TermPage from './pages/TermsPages';
import { Header } from './pages/Header';
import ToolPage from './pages/ToolPages';
import { ToolContent } from './pages/ToolPages/components/ToolContent';

const App = () => {
  return (
    <div className="page">
      <Header />
      <article className="content">
        <Routes>
          <Route path="/" element={<ToolPage />} />

          <Route path="/tool/:toolPath" element={<ToolContent />} />

          <Route path="/blog" element={<BlogList />}>
            <Route path="detail/:blogId" element={<BlogDetail />} />
          </Route>

          <Route path="terms" element={<TermPage />} />

          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </article>
    </div>
  );
};

export default App;
