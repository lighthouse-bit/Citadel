import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Image as ImageIcon, Loader, Download, Archive, CheckSquare, Star, DollarSign } from 'lucide-react';
import { artworksAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUSES = ['DRAFT','AVAILABLE','SOLD','RESERVED','NOT_FOR_SALE','ARCHIVED'];
const CATEGORIES = ['PAINTING','DRAWING','DIGITAL','MIXED_MEDIA','SCULPTURE','PHOTOGRAPHY'];
const statusStyle = { DRAFT:'bg-slate-100 text-slate-700', AVAILABLE:'bg-green-100 text-green-700', SOLD:'bg-red-100 text-red-700', RESERVED:'bg-yellow-100 text-yellow-700', NOT_FOR_SALE:'bg-stone-100 text-stone-700', ARCHIVED:'bg-purple-100 text-purple-700' };
const label = value => value?.replaceAll('_',' ').replace(/\b\w/g, letter => letter.toUpperCase());

export default function Artworks() {
  const [artworks, setArtworks] = useState([]);
  const [stats, setStats] = useState({ total:0, available:0, sold:0, drafts:0, availableValue:0 });
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [filters, setFilters] = useState({ search:'', status:'', category:'', sort:'createdAt', order:'desc', page:1 });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setLoading(true); const [{ data }, statsResponse] = await Promise.all([artworksAPI.getAll({ ...filters, limit:20 }), artworksAPI.getAdminStats()]); setArtworks(data.artworks); setPagination(data.pagination); setStats(statsResponse.data); }
    catch { toast.error('Failed to load artwork inventory'); } finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const filter = (key,value) => setFilters(previous => ({ ...previous, [key]:value, page:key==='page'?value:1 }));
  const toggle = id => setSelected(items => items.includes(id) ? items.filter(item => item!==id) : [...items,id]);

  const bulkUpdate = async data => {
    if (!selected.length) return;
    try { await artworksAPI.bulkUpdate(selected, data); toast.success(`${selected.length} artwork${selected.length===1?'':'s'} updated`); setSelected([]); load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Bulk update failed'); }
  };
  const remove = async artwork => {
    if (!window.confirm(`Delete “${artwork.title}”? This cannot be undone.`)) return;
    try { await artworksAPI.delete(artwork.id); toast.success('Artwork deleted'); load(); }
    catch (error) { toast.error(error.response?.data?.error || 'Delete failed'); }
  };
  const exportCsv = async () => {
    try { const { data } = await artworksAPI.exportCsv({ search:filters.search,status:filters.status,category:filters.category }); const url=URL.createObjectURL(data); const anchor=document.createElement('a'); anchor.href=url; anchor.download=`artwork-inventory-${new Date().toISOString().slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url); }
    catch { toast.error('Inventory export failed'); }
  };

  const wishlistLeaders = [...artworks]
    .filter(artwork => artwork._count?.wishlistItems > 0)
    .sort((left, right) => right._count.wishlistItems - left._count.wishlistItems)
    .slice(0, 5);

  return <div className="space-y-6">
    {wishlistLeaders.length > 0 && <section className="bg-rose-50 border border-rose-100 rounded-xl p-4"><div className="flex flex-wrap items-center gap-3"><div><h2 className="font-semibold text-stone-900">Wishlist demand</h2><p className="text-xs text-stone-500">Most saved artworks in the current inventory view</p></div><div className="flex flex-wrap gap-2 sm:ml-auto">{wishlistLeaders.map(artwork=><Link key={artwork.id} to={`/admin/artworks/${artwork.id}/edit`} className="bg-white border border-rose-100 rounded-lg px-3 py-2 text-xs text-stone-700 hover:border-rose-300"><b>{artwork.title}</b><span className="text-rose-600 ml-2">♥ {artwork._count.wishlistItems}</span></Link>)}</div></div></section>}
    <div className="flex flex-col sm:flex-row justify-between gap-3"><div><h1 className="text-2xl font-serif text-stone-900">Artwork Inventory</h1><p className="text-stone-500">Publishing, availability, pricing and sales performance.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 border bg-white px-4 py-2.5 rounded-lg text-sm"><Download size={16}/>Export</button><Link to="/admin/artworks/new" className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-lg text-sm"><Plus size={17}/>Add artwork</Link></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Total',stats.total],['Available',stats.available],['Sold',stats.sold],['Drafts',stats.drafts],['Available value',`$${Number(stats.availableValue).toLocaleString()}`]].map(([name,value])=><div key={name} className="bg-white border rounded-xl p-4"><p className="text-xs text-stone-500">{name}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}</div>
    <div className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-3"><label className="relative md:col-span-2"><Search size={17} className="absolute left-3 top-3 text-stone-400"/><input value={filters.search} onChange={e=>filter('search',e.target.value)} placeholder="Search title, description or medium" className="w-full pl-9 pr-3 py-2 border rounded-lg"/></label><select value={filters.status} onChange={e=>filter('status',e.target.value)} className="border rounded-lg px-3"><option value="">All statuses</option>{STATUSES.map(item=><option key={item} value={item}>{label(item)}</option>)}</select><select value={filters.category} onChange={e=>filter('category',e.target.value)} className="border rounded-lg px-3"><option value="">All categories</option>{CATEGORIES.map(item=><option key={item} value={item}>{label(item)}</option>)}</select><select value={`${filters.sort}:${filters.order}`} onChange={e=>{const [sort,order]=e.target.value.split(':');setFilters(previous=>({...previous,sort,order,page:1}));}} className="border rounded-lg px-3"><option value="createdAt:desc">Newest</option><option value="updatedAt:desc">Recently updated</option><option value="title:asc">Title</option><option value="price:desc">Price high–low</option><option value="price:asc">Price low–high</option></select></div>
    {selected.length>0&&<div className="sticky top-3 z-20 bg-stone-900 text-white rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-lg"><CheckSquare size={17}/><b className="text-sm">{selected.length} selected</b><select onChange={e=>e.target.value&&bulkUpdate({status:e.target.value})} defaultValue="" className="bg-white text-stone-900 rounded px-3 py-1.5 text-sm"><option value="" disabled>Change status…</option>{STATUSES.map(item=><option key={item}>{item}</option>)}</select><button onClick={()=>bulkUpdate({featured:true})} className="text-sm inline-flex gap-1"><Star size={15}/>Feature</button><button onClick={()=>bulkUpdate({featured:false})} className="text-sm">Unfeature</button><button onClick={()=>setSelected([])} className="ml-auto text-sm text-stone-300">Clear</button></div>}
    <div className="bg-white border rounded-xl overflow-x-auto">{loading?<Loader className="animate-spin m-12 mx-auto text-amber-600"/>:<table className="w-full text-sm"><thead className="bg-stone-50"><tr><th className="px-4 py-3"><input type="checkbox" checked={artworks.length>0&&selected.length===artworks.length} onChange={e=>setSelected(e.target.checked?artworks.map(item=>item.id):[])}/></th>{['Artwork','Category','Price','Status','Sales','Visibility','Actions'].map(item=><th key={item} className="text-left px-4 py-3 whitespace-nowrap">{item}</th>)}</tr></thead><tbody>{artworks.map(artwork=><tr key={artwork.id} className="border-t hover:bg-stone-50"><td className="px-4"><input type="checkbox" checked={selected.includes(artwork.id)} onChange={()=>toggle(artwork.id)}/></td><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-14 h-14 bg-stone-100 rounded overflow-hidden">{artwork.images?.[0]?<img src={artwork.images[0].url} alt="" className="w-full h-full object-cover"/>:<ImageIcon className="m-4 text-stone-300"/>}</div><div><b>{artwork.title}</b><p className="text-xs text-stone-500">{artwork.medium||'No medium'} · {artwork.year||'No year'}</p></div></div></td><td className="px-4">{label(artwork.category)}</td><td className="px-4 font-medium"><DollarSign size={13} className="inline"/>{Number(artwork.price).toLocaleString()}</td><td className="px-4"><span className={`px-2 py-1 rounded-full text-xs ${statusStyle[artwork.status]}`}>{label(artwork.status)}</span></td><td className="px-4">{artwork._count?.orderItems||0}</td><td className="px-4">{artwork.featured?<span className="text-amber-700"><Star size={14} className="inline fill-current"/> Featured</span>:<span className="text-stone-400">Standard</span>}</td><td className="px-4"><div className="flex gap-1"><Link to={`/artwork/${artwork.id}`} target="_blank" className="p-2"><Eye size={16}/></Link><Link to={`/admin/artworks/${artwork.id}/edit`} className="p-2"><Edit size={16}/></Link>{artwork._count?.orderItems>0?<button onClick={()=>bulkUpdate.call(null,{})} title="Archive this artwork instead" className="p-2 text-stone-300"><Archive size={16}/></button>:<button onClick={()=>remove(artwork)} className="p-2 text-red-600"><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></table>}</div>
    {!loading&&!artworks.length&&<div className="text-center py-14 text-stone-500"><ImageIcon className="mx-auto mb-3 text-stone-300"/>No artworks match these filters.</div>}
    {pagination.pages>1&&<div className="flex justify-center gap-3 items-center"><button disabled={pagination.page<=1} onClick={()=>filter('page',pagination.page-1)} className="border px-3 py-2 rounded disabled:opacity-40">Previous</button><span className="text-sm">Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page>=pagination.pages} onClick={()=>filter('page',pagination.page+1)} className="border px-3 py-2 rounded disabled:opacity-40">Next</button></div>}
  </div>;
}
