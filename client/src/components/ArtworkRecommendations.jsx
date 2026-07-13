import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';

export default function ArtworkRecommendations({ title, subtitle, artworks = [], limit = 4 }) {
  const { addToCart, isInCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const items = artworks.slice(0, limit);
  if (!items.length) return null;

  return <section className="py-12">
    <div className="flex items-end justify-between gap-4 mb-6"><div><h2 className="text-2xl md:text-3xl font-serif text-stone-900">{title}</h2>{subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}</div><Link to="/shop" className="text-sm text-amber-700 hover:text-amber-800">Explore all</Link></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{items.map(artwork => <article key={artwork.id} className="group bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      <Link to={`/artwork/${artwork.id}`} className="block aspect-[4/5] bg-stone-100 overflow-hidden">{artwork.images?.[0]?.url || artwork.images?.[0] ? <img src={artwork.images?.[0]?.url || artwork.images?.[0]} alt={artwork.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : <div className="w-full h-full grid place-items-center text-sm text-stone-400">Artwork image unavailable</div>}</Link>
      <div className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link to={`/artwork/${artwork.id}`} className="font-serif text-stone-900 line-clamp-1 hover:text-amber-700">{artwork.title}</Link><p className="text-xs text-stone-500 line-clamp-1 mt-1">{artwork.recommendationReason || artwork.medium}</p></div><button onClick={() => toggleWishlist(artwork)} aria-label="Toggle wishlist" className={`p-1 ${isWishlisted(artwork.id) ? 'text-red-500' : 'text-stone-400'}`}><Heart size={17} fill={isWishlisted(artwork.id) ? 'currentColor' : 'none'}/></button></div>
      <div className="flex items-center justify-between mt-4"><span className="text-sm font-medium">${Number(artwork.price || 0).toLocaleString()}</span>{artwork.status === 'AVAILABLE' && <button onClick={() => addToCart(artwork)} disabled={isInCart(artwork.id)} aria-label={`Add ${artwork.title} to cart`} className="p-2 rounded-full bg-stone-900 text-white disabled:bg-stone-300"><ShoppingBag size={14}/></button>}</div></div>
    </article>)}</div>
  </section>;
}
