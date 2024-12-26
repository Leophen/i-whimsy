import { Routes, Route } from 'react-router-dom';
import BlogDetail from './blogPages/BlogDetail';
import BlogList from './blogPages/BlogList';
import ErrorPage from './blogPages/ErrorPage';
import './styles/index.scss';
import TermPage from './blogPages/TermPage';
import { Header } from './header';
import ToolPage from './toolPages';

const App = () => {
  return (
    <div className="blog-wrapper">
      <Header />
      <article className="blog-content">
        <Routes>
          <Route path="/" element={<ToolPage />} />

          <Route path="/blog" element={<BlogList />}>
            <Route path="detail/:blogId" element={<BlogDetail />} />
            <Route path="terms" element={<TermPage />} />
          </Route>

          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </article>
    </div>
  );
};

export default App;
