import { Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import SEO from '../components/common/SEO';

const NotFound = () => (
  <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center px-6 pt-20">
    <SEO title="Page not found" noIndex />
    <div className="max-w-xl text-center">
      <p className="text-amber-500 text-sm tracking-[0.3em] uppercase mb-5">Error 404</p>
      <h1 className="font-serif text-5xl sm:text-6xl mb-6">This piece isn’t here.</h1>
      <p className="text-stone-400 leading-relaxed mb-10">
        The page may have moved, or the address may be incorrect. Continue exploring the current collection.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link to="/gallery" className="inline-flex items-center justify-center gap-2 bg-amber-600 px-6 py-3 rounded-lg hover:bg-amber-500 transition-colors">
          <Search size={17} /> Browse gallery
        </Link>
        <Link to="/" className="inline-flex items-center justify-center gap-2 border border-stone-700 px-6 py-3 rounded-lg hover:border-stone-500 transition-colors">
          <ArrowLeft size={17} /> Return home
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
