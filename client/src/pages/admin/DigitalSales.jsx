import { useCallback, useEffect, useState } from 'react';
import { Ban, Download, DollarSign, KeyRound, Loader, Mail, RefreshCcw, RotateCcw, Search, ShieldCheck, ShoppingBag, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { digitalSalesAPI } from '../../services/api';

const money = value => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

export default function DigitalSales() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', licenseType: '', access: '', page: 1 });
  const [dates, setDates] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await digitalSalesAPI.getSummary(dates);
      setSummary(data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load digital sales summary');
    }
  }, [dates]);

  const loadItems = useCallback(async () => {
    try {
      const { data } = await digitalSalesAPI.getEntitlements({ ...filters, limit: 20 });
      setItems(data.items || []);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load digital licences');
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSummary(), loadItems()]).finally(() => setLoading(false));
  }, [loadItems, loadSummary]);

  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value, page: 1 }));

  const changeAccess = async (item, action) => {
    let reason = '';
    if (action === 'REVOKE') {
      reason = window.prompt(`Why are you revoking access for ${item.customer.email}?`)?.trim() || '';
      if (!reason) return;
    } else if (!window.confirm(action === 'RESTORE' ? 'Restore this customer’s download access?' : 'Reset this licence to its full download allowance?')) return;
    setActionId(item.id);
    try {
      const { data } = await digitalSalesAPI.updateAccess(item.id, { action, reason });
      setItems(current => current.map(entry => entry.id === item.id ? data : entry));
      await loadSummary();
      toast.success(action === 'REVOKE' ? 'Access revoked' : action === 'RESTORE' ? 'Access restored' : 'Download allowance reset');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update access');
    } finally {
      setActionId('');
    }
  };

  const resendDeliveryEmail = async item => {
    if (!window.confirm(`Resend the secure delivery email to ${item.customer.email}?`)) return;
    setActionId(item.id);
    try {
      const { data } = await digitalSalesAPI.resendDeliveryEmail(item.id);
      toast.success(data.message || 'Delivery email sent');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not send the delivery email');
    } finally {
      setActionId('');
    }
  };

  const metrics = summary?.summary || {};
  const cards = [
    [DollarSign, 'Digital revenue', money(metrics.revenue)],
    [ShoppingBag, 'Paid licences', metrics.sales || 0],
    [Users, 'Collectors', metrics.collectors || 0],
    [Download, 'Downloads used', metrics.downloads || 0],
    [KeyRound, 'Entitlements', metrics.entitlements || 0],
    [Ban, 'Revoked', metrics.revoked || 0],
  ];

  if (loading && !summary) return <div className="grid min-h-72 place-items-center"><Loader className="animate-spin text-amber-700"/></div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-xs uppercase tracking-[0.18em] text-amber-700">Digital commerce</p><h1 className="mt-1 text-3xl font-serif text-stone-900">Digital Sales</h1><p className="mt-1 text-sm text-stone-500">Monitor licences, numbered editions, downloads, and customer access.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-stone-500">Revenue from<input type="date" value={dates.from} onChange={event => setDates(current => ({ ...current, from: event.target.value }))} className="mt-1 block rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"/></label><label className="text-xs text-stone-500">Revenue to<input type="date" value={dates.to} onChange={event => setDates(current => ({ ...current, to: event.target.value }))} className="mt-1 block rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"/></label><button onClick={() => Promise.all([loadSummary(), loadItems()])} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm"><RefreshCcw size={15}/> Refresh</button></div></div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{cards.map(([Icon, label, value]) => <div key={label} className="rounded-xl border border-stone-200 bg-white p-4"><Icon size={18} className="text-amber-700"/><p className="mt-3 text-xs text-stone-500">{label}</p><p className="mt-1 text-xl font-semibold text-stone-900">{value}</p></div>)}</div>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><section className="rounded-xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-stone-900">Top digital releases</h2><p className="text-xs text-stone-500">Fully paid licence revenue</p></div></div><div className="mt-4 space-y-3">{summary?.topReleases?.length ? summary.topReleases.map((release, index) => <div key={release.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg bg-stone-50 p-3"><span className="text-sm text-stone-400">{index + 1}</span><div><p className="text-sm font-medium">{release.title}</p><p className="text-xs text-stone-500">{release.sales} sale{release.sales === 1 ? '' : 's'}{release.editionSize ? ` · ${release.editionsIssued}/${release.editionSize} issued` : ''}</p></div><b className="text-sm">{money(release.revenue)}</b></div>) : <p className="py-8 text-center text-sm text-stone-400">No paid digital sales yet.</p>}</div></section><section className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">Licence mix</h2><p className="text-xs text-stone-500">All issued digital licences</p><div className="mt-6 space-y-5">{['PERSONAL_USE', 'COMMERCIAL_USE'].map(type => { const count = summary?.licenceMix?.find(item => item.type === type)?.count || 0; const total = Math.max(metrics.entitlements || 0, 1); return <div key={type}><div className="mb-2 flex justify-between text-sm"><span>{type === 'COMMERCIAL_USE' ? 'Commercial use' : 'Personal use'}</span><b>{count}</b></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-amber-600" style={{ width: `${count / total * 100}%` }}/></div></div>; })}</div></section></div>

    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-200 p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold text-stone-900">Issued licences</h2><p className="text-xs text-stone-500">{pagination.total} customer entitlement{pagination.total === 1 ? '' : 's'}</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Customer, artwork, order…" className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm sm:w-64"/></div><select value={filters.licenseType} onChange={event => updateFilter('licenseType', event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All licences</option><option value="PERSONAL_USE">Personal</option><option value="COMMERCIAL_USE">Commercial</option></select><select value={filters.access} onChange={event => updateFilter('access', event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All access</option><option value="ACTIVE">Active</option><option value="REVOKED">Revoked</option></select></div></div></div>
      {items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3">Artwork</th><th className="px-5 py-3">Collector</th><th className="px-5 py-3">Licence</th><th className="px-5 py-3">Edition</th><th className="px-5 py-3">Downloads</th><th className="px-5 py-3">Purchased</th><th className="px-5 py-3 text-right">Controls</th></tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-t border-stone-100"><td className="px-5 py-4"><div className="flex items-center gap-3">{item.artwork.previewUrl ? <img src={item.artwork.previewUrl} alt="" className="h-11 w-11 rounded-lg object-cover"/> : <div className="h-11 w-11 rounded-lg bg-stone-100"/>}<div><p className="font-medium text-stone-900">{item.artwork.title}</p><p className="text-xs text-stone-400">{item.order.orderNumber} · {money(item.paidPrice)}</p></div></div></td><td className="px-5 py-4"><p>{item.customer.firstName} {item.customer.lastName}</p><p className="text-xs text-stone-400">{item.customer.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${item.licenseType === 'COMMERCIAL_USE' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{item.licenseType === 'COMMERCIAL_USE' ? 'Commercial' : 'Personal'}</span>{item.revokedAt && <span className="ml-2 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700">Revoked</span>}</td><td className="px-5 py-4">{item.editionNumber ? `${item.editionNumber} of ${item.editionSize}` : 'Unlimited'}</td><td className="px-5 py-4"><p>{item.downloadCount} / {item.downloadLimit}</p><p className="text-xs text-stone-400">Last: {date(item.lastDownloadedAt)}</p></td><td className="px-5 py-4">{date(item.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => resendDeliveryEmail(item)} disabled={actionId === item.id} title="Resend delivery email" className="rounded-lg border border-amber-200 p-2 text-amber-700"><Mail size={15}/></button>{item.revokedAt ? <button onClick={() => changeAccess(item, 'RESTORE')} disabled={actionId === item.id} title="Restore access" className="rounded-lg border border-emerald-200 p-2 text-emerald-700"><ShieldCheck size={15}/></button> : <button onClick={() => changeAccess(item, 'REVOKE')} disabled={actionId === item.id} title="Revoke access" className="rounded-lg border border-red-200 p-2 text-red-600"><Ban size={15}/></button>}<button onClick={() => changeAccess(item, 'RESET_DOWNLOADS')} disabled={actionId === item.id} title="Reset download allowance" className="rounded-lg border border-stone-200 p-2 text-stone-600">{actionId === item.id ? <Loader size={15} className="animate-spin"/> : <RotateCcw size={15}/>}</button></div></td></tr>)}</tbody></table></div> : <p className="p-12 text-center text-sm text-stone-400">No digital licences match these filters.</p>}
      {pagination.pages > 1 && <div className="flex items-center justify-between border-t border-stone-200 px-5 py-3 text-sm"><span>Page {pagination.page} of {pagination.pages}</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))} className="rounded border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
    </section>
  </div>;
}
