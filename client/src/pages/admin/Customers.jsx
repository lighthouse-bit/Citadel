import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Loader, ShieldCheck, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { customersAPI } from '../../services/api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => { try { setLoading(true); const { data } = await customersAPI.getAll({ search }); setCustomers(data.customers); } catch { toast.error('Failed to load customers'); } finally { setLoading(false); } }, [search]);
  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer); }, [load]);
  const save = async () => { try { const { data } = await customersAPI.update(selected.id, { adminNotes: selected.adminNotes, isSuspended: selected.isSuspended }); setCustomers(items => items.map(item => item.id === data.id ? { ...item, ...data } : item)); setSelected(null); toast.success('Customer updated'); } catch { toast.error('Update failed'); } };
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-serif text-stone-900">Customers</h1><p className="text-stone-500">Manage customer access, history and internal notes.</p></div>
    <div className="relative max-w-xl"><Search className="absolute left-3 top-3 text-stone-400" size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email" className="w-full pl-10 pr-4 py-2.5 border rounded-lg"/></div>
    <div className="bg-white border rounded-xl overflow-x-auto">{loading ? <Loader className="animate-spin m-12 mx-auto"/> : <table className="w-full text-sm"><thead className="bg-stone-50"><tr>{['Customer','Status','Orders','Lifetime value','Joined',''].map(x=><th key={x} className="text-left px-5 py-3">{x}</th>)}</tr></thead><tbody>{customers.map(c=><tr key={c.id} className="border-t"><td className="px-5 py-4"><b>{c.firstName} {c.lastName}</b><div className="text-stone-500">{c.email}</div></td><td className="px-5">{c.isSuspended?<span className="text-red-600">Suspended</span>:c.isVerified?<span className="text-green-700">Verified</span>:<span className="text-amber-700">Unverified</span>}</td><td className="px-5">{c._count.orders}</td><td className="px-5">${Number(c.lifetimeValue).toLocaleString()}</td><td className="px-5">{new Date(c.createdAt).toLocaleDateString()}</td><td className="px-5"><button onClick={()=>setSelected(c)} className="text-amber-700">Manage</button></td></tr>)}</tbody></table>}</div>
    {selected&&<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl p-6 max-w-lg w-full"><div className="flex gap-3 items-center mb-4"><Users/><div><h2 className="font-semibold">{selected.firstName} {selected.lastName}</h2><p className="text-sm text-stone-500">{selected.email}</p></div></div><label className="flex gap-2 mb-4"><input type="checkbox" checked={selected.isSuspended} onChange={e=>setSelected({...selected,isSuspended:e.target.checked})}/><Ban size={17}/> Suspend account</label><label className="text-sm">Internal notes<textarea value={selected.adminNotes||''} onChange={e=>setSelected({...selected,adminNotes:e.target.value})} rows="5" className="w-full border rounded-lg p-3 mt-2"/></label><div className="flex justify-end gap-3 mt-5"><button onClick={()=>setSelected(null)}>Cancel</button><button onClick={save} className="bg-stone-900 text-white px-4 py-2 rounded-lg"><ShieldCheck size={16} className="inline mr-2"/>Save</button></div></div></div>}
  </div>;
}
