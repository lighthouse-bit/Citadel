import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Calendar, DollarSign, User, Loader, CreditCard, Download, LayoutGrid, Columns3, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { commissionsAPI } from '../../services/api';

const STATUSES = ['PENDING', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS', 'REVISION', 'COMPLETED', 'CANCELLED'];
const ACTIVE_COLUMNS = ['PENDING', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS', 'REVISION', 'COMPLETED'];
const statusStyle = {
  PENDING: 'bg-yellow-100 text-yellow-700', REVIEWING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-purple-100 text-purple-700',
  REVISION: 'bg-orange-100 text-orange-700', COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};
const paymentStyle = { UNPAID: 'bg-red-100 text-red-700', DEPOSIT_PAID: 'bg-blue-100 text-blue-700', FULLY_PAID: 'bg-green-100 text-green-700' };
const label = value => value?.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const CommissionCard = ({ commission, draggable = false, onDragStart }) => (
  <article draggable={draggable} onDragStart={onDragStart} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-stone-400 font-mono">{commission.commissionNumber}</p>
        <h3 className="font-semibold text-stone-900 truncate">{commission.artStyle}</h3>
      </div>
      {commission.isOverdue && <span title="Overdue"><AlertTriangle size={17} className="text-red-500" /></span>}
    </div>
    <p className="mt-2 text-sm text-stone-600 flex items-center gap-1"><User size={14} /> {commission.customer?.firstName} {commission.customer?.lastName}</p>
    <div className="flex flex-wrap gap-1.5 mt-3">
      <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${statusStyle[commission.status]}`}>{label(commission.status)}</span>
      <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${paymentStyle[commission.paymentStatus] || 'bg-stone-100'}`}><CreditCard size={10} className="inline mr-1" />{label(commission.paymentStatus)}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-stone-500">
      <span className="flex items-center gap-1"><DollarSign size={13} />{commission.finalPrice ? Number(commission.finalPrice).toLocaleString() : `Est. ${Number(commission.estimatedPrice || 0).toLocaleString()}`}</span>
      <span className={commission.isOverdue ? 'text-red-600 font-medium flex items-center gap-1' : 'flex items-center gap-1'}><Calendar size={13} />{commission.deadline ? new Date(commission.deadline).toLocaleDateString() : 'No deadline'}</span>
    </div>
    {commission.amountDue > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800">${commission.amountDue.toLocaleString()} payment due</p>}
    <Link to={`/admin/commissions/${commission.id}`} className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"><Eye size={14} /> View details</Link>
  </article>
);

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [filters, setFilters] = useState({ search: '', status: '', paymentStatus: '', overdue: false, page: 1 });

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await commissionsAPI.getAll({ ...filters, overdue: filters.overdue || undefined, limit: view === 'board' ? 100 : 20 });
      setCommissions(response.data.commissions);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load commissions');
    } finally { setLoading(false); }
  }, [filters, view]);

  useEffect(() => { const timer = setTimeout(fetchCommissions, 250); return () => clearTimeout(timer); }, [fetchCommissions]);
  const updateFilter = (key, value) => setFilters(previous => ({ ...previous, [key]: value, page: key === 'page' ? value : 1 }));

  const exportCsv = async () => {
    try {
      const response = await commissionsAPI.exportCsv({ ...filters, page: undefined });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to export commissions'); }
  };

  const moveCommission = async (commission, status) => {
    if (commission.status === status) return;
    if (status === 'ACCEPTED' && !commission.finalPrice) return toast.error('Set the final price in commission details before accepting');
    if (status === 'CANCELLED') return toast.error('Cancel commissions from the detail page so a reason is recorded');
    try {
      await commissionsAPI.updateStatus(commission.id, { status });
      setCommissions(items => items.map(item => item.id === commission.id ? { ...item, status } : item));
      toast.success(`Moved to ${label(status)}`);
    } catch (error) { toast.error(error.response?.data?.error || 'Could not move commission'); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><h1 className="text-2xl text-stone-900" style={{ fontFamily: "'Playfair Display', serif" }}>Commissions</h1><p className="text-stone-500">Track work, deadlines and client payments</p></div>
      <div className="flex gap-2">
        <button onClick={() => setView(view === 'grid' ? 'board' : 'grid')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm"><Columns3 size={16} />{view === 'grid' ? 'Kanban' : 'Cards'}</button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-900 text-white text-sm"><Download size={16} />Export</button>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Total', pagination.total], ['Overdue', commissions.filter(c => c.isOverdue).length], ['Deposit due', commissions.filter(c => c.paymentStatus === 'UNPAID' && c.status === 'ACCEPTED').length], ['Balance due', commissions.filter(c => c.paymentStatus === 'DEPOSIT_PAID').length]].map(([name, value]) => <div key={name} className="bg-white border rounded-xl p-4"><p className="text-xs text-stone-500">{name}</p><p className="text-2xl font-bold mt-1">{value}</p></div>)}
    </div>
    <div className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3">
      <label className="relative md:col-span-2"><Search size={17} className="absolute left-3 top-3 text-stone-400" /><input value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Search client, email, number or style" className="w-full pl-9 pr-3 py-2 border rounded-lg" /></label>
      <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className="border rounded-lg px-3"><option value="">All statuses</option>{STATUSES.map(status => <option key={status} value={status}>{label(status)}</option>)}</select>
      <select value={filters.paymentStatus} onChange={e => updateFilter('paymentStatus', e.target.value)} className="border rounded-lg px-3"><option value="">All payments</option><option value="UNPAID">Unpaid</option><option value="DEPOSIT_PAID">Deposit paid</option><option value="FULLY_PAID">Fully paid</option></select>
      <label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" checked={filters.overdue} onChange={e => updateFilter('overdue', e.target.checked)} />Overdue only</label>
    </div>
    {loading ? <div className="py-20 flex justify-center"><Loader className="animate-spin text-amber-600" /></div> : view === 'board' ?
      <div className="overflow-x-auto pb-4"><div className="flex gap-4 min-w-max">{ACTIVE_COLUMNS.map(status => <section key={status} onDragOver={event => event.preventDefault()} onDrop={event => { const item = commissions.find(c => c.id === event.dataTransfer.getData('commissionId')); if (item) moveCommission(item, status); }} className="w-72 rounded-xl bg-stone-100 p-3 min-h-72"><div className="flex justify-between mb-3"><h2 className="font-semibold text-sm">{label(status)}</h2><span className="text-xs bg-white rounded-full px-2 py-0.5">{commissions.filter(c => c.status === status).length}</span></div><div className="space-y-3">{commissions.filter(c => c.status === status).map(c => <CommissionCard key={c.id} commission={c} draggable onDragStart={event => event.dataTransfer.setData('commissionId', c.id)} />)}</div></section>)}</div></div>
      : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{commissions.map(c => <CommissionCard key={c.id} commission={c} />)}</div>}
    {!loading && !commissions.length && <div className="bg-white border rounded-xl py-16 text-center text-stone-500"><LayoutGrid className="mx-auto mb-3 text-stone-300" />No commissions match these filters.</div>}
    {view === 'grid' && pagination.pages > 1 && <div className="flex justify-center items-center gap-3"><button disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Previous</button><span className="text-sm">Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)} className="px-3 py-2 border rounded-lg disabled:opacity-40">Next</button></div>}
  </div>;
};

export default Commissions;
