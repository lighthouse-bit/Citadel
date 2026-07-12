import { createElement, useCallback, useEffect, useState } from 'react';
import { Search, Users, Loader, ShieldCheck, Ban, Download, Mail, Phone, ShoppingBag, Palette, Clock, MapPin, X, Tag, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { customersAPI } from '../../services/api';

const badge = customer => customer.isSuspended
  ? ['Suspended', 'bg-red-100 text-red-700']
  : customer.isVerified ? ['Verified', 'bg-green-100 text-green-700'] : ['Unverified', 'bg-amber-100 text-amber-700'];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', verified: '', suspended: '', tag: '', sort: 'newest', page: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await customersAPI.getAll(filters);
      setCustomers(data.customers); setPagination(data.pagination);
    } catch { toast.error('Failed to load customers'); } finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer); }, [load]);
  const filter = (key, value) => setFilters(previous => ({ ...previous, [key]: value, page: key === 'page' ? value : 1 }));

  const openCustomer = async id => {
    setDetailLoading(true);
    try { const { data } = await customersAPI.getById(id); setSelected(data); }
    catch { toast.error('Failed to load customer profile'); }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    if (selected.isSuspended && !selected.suspensionReason?.trim()) return toast.error('Enter a suspension reason');
    try {
      setSaving(true);
      const { data } = await customersAPI.update(selected.id, { adminNotes: selected.adminNotes, adminTags: selected.adminTags, isSuspended: selected.isSuspended, suspensionReason: selected.suspensionReason });
      setCustomers(items => items.map(item => item.id === data.id ? { ...item, ...data } : item));
      setSelected(previous => ({ ...previous, ...data })); toast.success('Customer profile updated');
    } catch (error) { toast.error(error.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const addTag = () => {
    const value = tagInput.trim().toLowerCase();
    if (value && !selected.adminTags.includes(value)) setSelected(previous => ({ ...previous, adminTags: [...previous.adminTags, value] }));
    setTagInput('');
  };

  const exportCsv = async () => {
    try {
      const { data } = await customersAPI.exportCsv({ ...filters, page: undefined });
      const url = URL.createObjectURL(data); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Customer export failed'); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between gap-3">
      <div><h1 className="text-2xl font-serif text-stone-900">Customers</h1><p className="text-stone-500">Customer relationships, purchase history and account access.</p></div>
      <button onClick={exportCsv} className="self-start inline-flex gap-2 items-center bg-stone-900 text-white px-4 py-2 rounded-lg text-sm"><Download size={16}/>Export CSV</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Customers', pagination.total], ['On this page', customers.length], ['Verified', customers.filter(c => c.isVerified).length], ['Suspended', customers.filter(c => c.isSuspended).length]].map(([label, value]) => <div key={label} className="bg-white border rounded-xl p-4"><p className="text-xs text-stone-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}
    </div>
    <div className="bg-white border rounded-xl p-4 grid md:grid-cols-5 gap-3">
      <label className="relative md:col-span-2"><Search className="absolute left-3 top-3 text-stone-400" size={18}/><input value={filters.search} onChange={e => filter('search', e.target.value)} placeholder="Search name, email or phone" className="w-full pl-10 pr-4 py-2.5 border rounded-lg"/></label>
      <select value={filters.verified} onChange={e => filter('verified', e.target.value)} className="border rounded-lg px-3"><option value="">Any verification</option><option value="true">Verified</option><option value="false">Unverified</option></select>
      <select value={filters.suspended} onChange={e => filter('suspended', e.target.value)} className="border rounded-lg px-3"><option value="">Any access</option><option value="false">Active</option><option value="true">Suspended</option></select>
      <select value={filters.sort} onChange={e => filter('sort', e.target.value)} className="border rounded-lg px-3"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name</option></select>
    </div>
    <div className="bg-white border rounded-xl overflow-x-auto">{loading ? <Loader className="animate-spin m-12 mx-auto"/> : <table className="w-full text-sm"><thead className="bg-stone-50"><tr>{['Customer','Status','Tags','Orders / commissions','Paid value','Joined',''].map(column => <th key={column} className="text-left px-5 py-3 whitespace-nowrap">{column}</th>)}</tr></thead><tbody>{customers.map(customer => { const [status, style] = badge(customer); return <tr key={customer.id} className="border-t hover:bg-stone-50"><td className="px-5 py-4"><b>{customer.firstName} {customer.lastName}</b><a href={`mailto:${customer.email}`} className="block text-stone-500 hover:text-amber-700">{customer.email}</a></td><td className="px-5"><span className={`text-xs px-2 py-1 rounded-full font-medium ${style}`}>{status}</span></td><td className="px-5"><div className="flex gap-1 flex-wrap">{customer.adminTags?.slice(0, 3).map(tag => <span key={tag} className="bg-stone-100 px-2 py-0.5 rounded text-xs">{tag}</span>)}</div></td><td className="px-5 whitespace-nowrap">{customer._count.orders} / {customer._count.commissions}</td><td className="px-5 font-medium">${Number(customer.lifetimeValue).toLocaleString()}</td><td className="px-5 whitespace-nowrap">{new Date(customer.createdAt).toLocaleDateString()}</td><td className="px-5"><button onClick={() => openCustomer(customer.id)} className="text-amber-700 font-medium">View profile</button></td></tr>;})}</tbody></table>}</div>
    {!loading && !customers.length && <div className="text-center py-14 text-stone-500"><Users className="mx-auto mb-3 text-stone-300"/>No customers match these filters.</div>}
    {pagination.pages > 1 && <div className="flex justify-center items-center gap-3"><button disabled={pagination.page <= 1} onClick={() => filter('page', pagination.page - 1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page >= pagination.pages} onClick={() => filter('page', pagination.page + 1)} className="border rounded-lg px-3 py-2 disabled:opacity-40">Next</button></div>}

    {detailLoading && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"><Loader className="animate-spin text-white"/></div>}
    {selected && <div className="fixed inset-0 bg-black/50 z-50 flex justify-end"><div className="bg-stone-50 h-full w-full max-w-3xl overflow-y-auto shadow-2xl">
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex justify-between"><div><h2 className="text-xl font-semibold">{selected.firstName} {selected.lastName}</h2><p className="text-sm text-stone-500">Customer since {new Date(selected.createdAt).toLocaleDateString()}</p></div><button onClick={() => setSelected(null)}><X/></button></div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[[DollarSign,'Paid value',`$${Number(selected.lifetimeValue).toLocaleString()}`],[ShoppingBag,'Orders',selected.orders.length],[Palette,'Commissions',selected.commissions.length],[MapPin,'Addresses',selected.addresses.length]].map(([icon,label,value]) => <div key={label} className="bg-white border rounded-xl p-3">{createElement(icon, { size: 17, className: 'text-amber-700' })}<p className="text-xs text-stone-500 mt-2">{label}</p><p className="font-bold">{value}</p></div>)}</div>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3">Contact</h3><div className="grid sm:grid-cols-2 gap-3 text-sm"><a href={`mailto:${selected.email}`} className="flex gap-2 text-amber-700"><Mail size={16}/>{selected.email}</a>{selected.phone && <a href={`tel:${selected.phone}`} className="flex gap-2"><Phone size={16}/>{selected.phone}</a>}</div></section>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3 flex gap-2"><Tag size={17}/>Internal tags</h3><div className="flex gap-2 flex-wrap mb-3">{selected.adminTags.map(tag => <button key={tag} onClick={() => setSelected(previous => ({ ...previous, adminTags: previous.adminTags.filter(item => item !== tag) }))} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">{tag} ×</button>)}</div><div className="flex gap-2"><input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="vip, collector, wholesale..." className="border rounded-lg px-3 py-2 flex-1"/><button onClick={addTag} className="border rounded-lg px-3">Add</button></div></section>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3">Account controls</h3><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={selected.isSuspended} onChange={e => setSelected(previous => ({ ...previous, isSuspended: e.target.checked, suspensionReason: e.target.checked ? previous.suspensionReason : '' }))}/><Ban size={17} className="text-red-600"/>Suspend account access</label>{selected.isSuspended && <textarea value={selected.suspensionReason || ''} onChange={e => setSelected(previous => ({ ...previous, suspensionReason: e.target.value }))} placeholder="Required suspension reason" rows="2" className="w-full border border-red-200 rounded-lg p-3 mt-3"/>}</section>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3">Internal notes</h3><textarea value={selected.adminNotes || ''} onChange={e => setSelected(previous => ({ ...previous, adminNotes: e.target.value }))} rows="5" className="w-full border rounded-lg p-3"/></section>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3">Recent orders and commissions</h3><div className="space-y-2 max-h-64 overflow-y-auto">{[...selected.orders.map(item => ({ ...item, kind: 'Order', title: item.orderNumber })), ...selected.commissions.map(item => ({ ...item, kind: 'Commission', title: item.commissionNumber }))].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).map(item => <div key={`${item.kind}-${item.id}`} className="flex justify-between border-b py-2 text-sm"><div><b>{item.title}</b><p className="text-xs text-stone-500">{item.kind} · {new Date(item.createdAt).toLocaleDateString()}</p></div><span>{item.status.replaceAll('_',' ')}</span></div>)}</div></section>
        <section className="bg-white border rounded-xl p-5"><h3 className="font-semibold mb-3 flex gap-2"><Clock size={17}/>Admin activity</h3><div className="space-y-3">{selected.auditLogs.length ? selected.auditLogs.map(log => <div key={log.id} className="border-l-2 border-amber-300 pl-3 text-sm"><b>{log.action.replaceAll('_',' ')}</b><p className="text-xs text-stone-500">{log.admin?.name || log.admin?.email} · {new Date(log.createdAt).toLocaleString()}</p>{log.metadata?.suspensionReason && <p className="text-xs text-red-600">{log.metadata.suspensionReason}</p>}</div>) : <p className="text-sm text-stone-500">No admin changes recorded yet.</p>}</div></section>
        <div className="sticky bottom-0 bg-stone-50 py-3 flex justify-end"><button onClick={save} disabled={saving} className="bg-stone-900 text-white px-5 py-2.5 rounded-lg disabled:opacity-50"><ShieldCheck size={16} className="inline mr-2"/>{saving ? 'Saving...' : 'Save customer'}</button></div>
      </div>
    </div></div>}
  </div>;
}
