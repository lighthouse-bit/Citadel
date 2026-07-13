import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Loader, MessageSquare, Search, Send, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSupportAPI } from '../../services/api';
import { uploadMultipleToCloudinary } from '../../utils/uploadToCloudinary';

const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const pretty = value => value?.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());
const statusClass = status => ({ OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-purple-100 text-purple-700', WAITING_FOR_CUSTOMER: 'bg-amber-100 text-amber-700', RESOLVED: 'bg-green-100 text-green-700', CLOSED: 'bg-stone-200 text-stone-600' }[status] || 'bg-stone-100');
const priorityClass = priority => ({ LOW: 'text-stone-500', NORMAL: 'text-blue-600', HIGH: 'text-orange-600', URGENT: 'text-red-600 font-semibold' }[priority]);

export default function Support() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'ALL', priority: 'ALL' });

  const loadList = async () => {
    try {
      setLoading(true);
      const { data } = await adminSupportAPI.getTickets(filters);
      setTickets(data.tickets || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load support queue');
    } finally { setLoading(false); }
  };

  const loadTicket = async () => {
    try {
      setLoading(true);
      const { data } = await adminSupportAPI.getTicket(id);
      setTicket(data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load support request');
      navigate('/admin/support');
    } finally { setLoading(false); }
  };

  // Route changes select either the queue or a specific conversation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (id) loadTicket(); else loadList(); }, [id]);

  const updateTicket = async changes => {
    try {
      setSaving(true);
      const { data } = await adminSupportAPI.update(id, changes);
      setTicket(data);
      toast.success('Support request updated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update request');
    } finally { setSaving(false); }
  };

  const sendReply = async event => {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      setSaving(true);
      const uploaded = files.length ? await uploadMultipleToCloudinary(files) : [];
      await adminSupportAPI.reply(id, { message: reply, attachments: uploaded.map((item, index) => ({ ...item, name: files[index]?.name })) });
      setReply('');
      setFiles([]);
      await loadTicket();
      toast.success('Reply sent');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not send reply');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-24 grid place-items-center"><Loader className="animate-spin text-amber-600" /></div>;

  if (!id) return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-serif">Customer Support</h1><p className="text-stone-500">Manage customer issues, conversations and resolutions.</p></div>
      <form onSubmit={event => { event.preventDefault(); loadList(); }} className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <label className="relative flex-1 min-w-60"><Search size={16} className="absolute left-3 top-3.5 text-stone-400" /><input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Ticket, subject or customer email" className="w-full border rounded-lg py-3 pl-9 pr-3" /></label>
        <select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} className="border rounded-lg px-3 bg-white"><option value="ALL">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select>
        <select value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value })} className="border rounded-lg px-3 bg-white"><option value="ALL">All priorities</option>{priorities.map(value => <option key={value}>{value}</option>)}</select>
        <button className="bg-stone-900 text-white px-5 rounded-lg">Filter</button>
      </form>
      <div className="bg-white border rounded-xl overflow-hidden">
        {tickets.length ? tickets.map(item => <Link key={item.id} to={`/admin/support/${item.id}`} className="grid md:grid-cols-[1fr_180px_140px] gap-3 items-center p-5 border-b last:border-0 hover:bg-stone-50"><div className="flex gap-3 min-w-0"><span className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 grid place-items-center flex-none"><MessageSquare size={18} /></span><span className="min-w-0"><span className="block font-medium truncate">{item.subject}</span><span className="block text-xs text-stone-500 mt-1">{item.ticketNumber} · {item.customer.firstName} {item.customer.lastName} · {item._count.messages} messages</span></span></div><span className={`text-sm ${priorityClass(item.priority)}`}>{pretty(item.priority)} priority</span><span className={`text-xs px-2.5 py-1 rounded-full text-center ${statusClass(item.status)}`}>{pretty(item.status)}</span></Link>) : <div className="p-16 text-center text-stone-500"><MessageSquare className="mx-auto mb-3 text-stone-300" size={36} />No support requests match these filters.</div>}
      </div>
    </div>
  );

  if (!ticket) return null;
  return (
    <div className="space-y-5">
      <Link to="/admin/support" className="inline-flex items-center gap-1 text-sm text-stone-500"><ArrowLeft size={16} /> Support queue</Link>
      <div className="grid xl:grid-cols-[1fr_300px] gap-5">
        <section className="bg-white border rounded-xl overflow-hidden">
          <div className="p-5 border-b"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-serif">{ticket.subject}</h1><p className="text-xs text-stone-500 mt-1">{ticket.ticketNumber} · {pretty(ticket.category)}</p></div><span className={`self-start text-xs px-2.5 py-1 rounded-full ${statusClass(ticket.status)}`}>{pretty(ticket.status)}</span></div></div>
          <div className="p-5 space-y-4 max-h-[560px] overflow-y-auto bg-stone-50">{ticket.messages.map(message => <div key={message.id} className={`flex ${message.authorType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-4 py-3 ${message.authorType === 'ADMIN' ? 'bg-stone-900 text-white' : 'bg-white border'}`}><p className="text-xs opacity-60 mb-1">{message.authorType === 'ADMIN' ? message.admin?.name || 'Admin' : `${ticket.customer.firstName} ${ticket.customer.lastName}`}</p><p className="text-sm whitespace-pre-wrap leading-6">{message.body}</p>{message.attachments?.length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">{message.attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name || 'Attachment'} className="rounded-lg w-full h-32 object-cover" /></a>)}</div>}<p className="text-[10px] opacity-50 mt-2">{new Date(message.createdAt).toLocaleString()}</p></div></div>)}</div>
          {ticket.status !== 'CLOSED' && <form onSubmit={sendReply} className="p-4 border-t space-y-3"><textarea rows="4" value={reply} onChange={event => setReply(event.target.value)} className="w-full border rounded-lg p-3 resize-none" placeholder="Reply to the customer…" /><div className="flex flex-wrap justify-between gap-3"><div><label className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer"><ImagePlus size={16} /> Attach images<input type="file" accept="image/*" multiple className="sr-only" onChange={event => setFiles(previous => [...previous, ...Array.from(event.target.files || [])].slice(0, 5))} /></label>{files.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="text-xs bg-stone-100 px-2 py-1 rounded inline-flex gap-1">{file.name}<button type="button" onClick={() => setFiles(items => items.filter((_, i) => i !== index))}><X size={11} /></button></span>)}</div>}</div><button disabled={saving || !reply.trim()} className="inline-flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg disabled:opacity-50">{saving ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Send reply</button></div></form>}
        </section>
        <aside className="space-y-4">
          <div className="bg-white border rounded-xl p-5"><h2 className="font-semibold mb-4">Customer</h2><p>{ticket.customer.firstName} {ticket.customer.lastName}</p><a href={`mailto:${ticket.customer.email}`} className="text-sm text-amber-700 break-all">{ticket.customer.email}</a></div>
          <div className="bg-white border rounded-xl p-5 space-y-4"><h2 className="font-semibold">Ticket controls</h2><label className="block text-xs text-stone-500">Status<select disabled={saving} value={ticket.status} onChange={event => updateTicket({ status: event.target.value })} className="block w-full border rounded-lg p-2.5 mt-1 bg-white">{statuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-xs text-stone-500">Priority<select disabled={saving} value={ticket.priority} onChange={event => updateTicket({ priority: event.target.value })} className="block w-full border rounded-lg p-2.5 mt-1 bg-white">{priorities.map(value => <option key={value}>{value}</option>)}</select></label><button disabled={saving} onClick={() => updateTicket({ assignToMe: true })} className="w-full border rounded-lg p-2.5 inline-flex justify-center items-center gap-2"><UserCheck size={16} /> {ticket.assignedAdmin ? `Assigned to ${ticket.assignedAdmin.name}` : 'Assign to me'}</button></div>
          {(ticket.order || ticket.commission) && <div className="bg-white border rounded-xl p-5"><h2 className="font-semibold mb-3">Related record</h2>{ticket.order && <Link to={`/admin/orders/${ticket.order.id}`} className="text-sm text-amber-700">Order #{ticket.order.orderNumber}</Link>}{ticket.commission && <Link to={`/admin/commissions/${ticket.commission.id}`} className="text-sm text-amber-700">Commission #{ticket.commission.commissionNumber}</Link>}</div>}
        </aside>
      </div>
    </div>
  );
}
