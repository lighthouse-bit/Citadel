import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock3, Loader, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { privacyRequestsAPI } from '../../services/api';

const labels = { ACCESS: 'Access', DELETION: 'Deletion', RECTIFICATION: 'Rectification', OBJECTION: 'Objection', PORTABILITY: 'Portability' };
const statusStyle = { PENDING: 'bg-amber-100 text-amber-800', IN_REVIEW: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700' };

export default function PrivacyRequests() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', type: '', status: '', page: 1 });
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState({ status: 'IN_REVIEW', response: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await privacyRequestsAPI.getAdmin({ ...filters, limit: 20 });
      setItems(data.items || []);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load privacy requests');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  const openRequest = item => {
    setSelected(item);
    setResolution({ status: item.status === 'PENDING' ? 'IN_REVIEW' : item.status, response: item.response || '' });
  };
  const save = async event => {
    event.preventDefault();
    try {
      setSaving(true);
      const { data } = await privacyRequestsAPI.updateAdmin(selected.id, resolution);
      setItems(current => current.map(item => item.id === data.id ? data : item));
      setSelected(data);
      toast.success('Privacy request updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update privacy request');
    } finally { setSaving(false); }
  };

  const openCount = items.filter(item => ['PENDING', 'IN_REVIEW'].includes(item.status)).length;
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-amber-700">Data protection</p><h1 className="mt-1 font-serif text-3xl text-stone-900">Privacy Requests</h1><p className="mt-1 text-sm text-stone-500">Review, respond to, and audit customer data-subject requests.</p></div><div className="flex gap-3"><div className="rounded-xl border bg-white px-4 py-3"><span className="text-xs text-stone-400">Total</span><b className="ml-3">{pagination.total}</b></div><div className="rounded-xl border bg-white px-4 py-3"><span className="text-xs text-stone-400">Open on page</span><b className="ml-3 text-amber-700">{openCount}</b></div></div></div>
    <section className="rounded-xl border border-stone-200 bg-white"><div className="flex flex-col gap-3 border-b p-5 lg:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Search customer name or email" className="w-full rounded-lg border border-stone-200 py-2.5 pl-10 pr-3 text-sm"/></div><select value={filters.type} onChange={event => updateFilter('type', event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 text-sm"><option value="">All request types</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={filters.status} onChange={event => updateFilter('status', event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="IN_REVIEW">In review</option><option value="COMPLETED">Completed</option><option value="REJECTED">Rejected</option></select></div>
      {loading ? <div className="grid min-h-56 place-items-center"><Loader className="animate-spin text-amber-700"/></div> : items.length ? <div className="divide-y divide-stone-100">{items.map(item => <button key={item.id} onClick={() => openRequest(item)} className="grid w-full gap-3 p-5 text-left transition hover:bg-stone-50 md:grid-cols-[1fr_0.8fr_0.6fr_auto] md:items-center"><div><p className="font-medium text-stone-900">{item.customer.firstName} {item.customer.lastName}</p><p className="text-xs text-stone-500">{item.customer.email}</p></div><div><p className="text-sm">{labels[item.type] || item.type}</p><p className="mt-1 line-clamp-1 text-xs text-stone-400">{item.details || 'No additional details'}</p></div><p className="text-xs text-stone-500">{new Date(item.createdAt).toLocaleDateString()}</p><span className={`justify-self-start rounded-full px-2.5 py-1 text-xs md:justify-self-end ${statusStyle[item.status]}`}>{item.status.replace('_', ' ')}</span></button>)}</div> : <div className="py-16 text-center"><ShieldCheck className="mx-auto text-stone-300" size={42}/><p className="mt-3 text-sm text-stone-500">No privacy requests match these filters.</p></div>}
      {pagination.pages > 1 && <div className="flex items-center justify-between border-t px-5 py-3 text-sm"><span>Page {pagination.page} of {pagination.pages}</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
    </section>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={event => event.target === event.currentTarget && setSelected(null)}><form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="border-b p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-amber-700"/><div><h2 className="font-serif text-2xl">{labels[selected.type]} request</h2><p className="text-sm text-stone-500">{selected.customer.firstName} {selected.customer.lastName} · {selected.customer.email}</p></div></div></div><div className="space-y-5 p-6"><div className="rounded-xl bg-stone-50 p-4"><p className="text-xs uppercase text-stone-400">Customer details</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{selected.details || 'No additional details supplied.'}</p></div><label className="block"><span className="mb-2 block text-xs font-medium uppercase text-stone-500">Status</span><select value={resolution.status} onChange={event => setResolution(current => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border px-4 py-3"><option value="IN_REVIEW">In review</option><option value="COMPLETED">Completed</option><option value="REJECTED">Rejected</option></select></label><label className="block"><span className="mb-2 block text-xs font-medium uppercase text-stone-500">Customer-facing response</span><textarea rows={7} maxLength={4000} value={resolution.response} onChange={event => setResolution(current => ({ ...current, response: event.target.value }))} placeholder="Explain the action taken, records retained, or reason for the decision." className="w-full resize-y rounded-lg border px-4 py-3"/></label>{selected.handledBy && <p className="flex items-center gap-2 text-xs text-stone-500"><Clock3 size={14}/> Last handled by {selected.handledBy.name}</p>}</div><div className="flex justify-end gap-2 border-t p-5"><button type="button" onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2.5">Close</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-white disabled:opacity-50">{saving ? <Loader size={16} className="animate-spin"/> : <CheckCircle size={16}/>} Save response</button></div></form></div>}
  </div>;
}
