import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Loader, MessageCircle, Paperclip, Plus, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supportAPI } from '../services/api';
import { uploadMultipleToCloudinary } from '../utils/uploadToCloudinary';

const categories = [['ORDER', 'Order'], ['DELIVERY', 'Delivery'], ['DAMAGE', 'Damage'], ['PAYMENT', 'Payment'], ['COMMISSION', 'Commission'], ['ACCOUNT', 'Account'], ['OTHER', 'Other']];
const statusClass = status => ({ OPEN: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-purple-100 text-purple-700', WAITING_FOR_CUSTOMER: 'bg-amber-100 text-amber-700', RESOLVED: 'bg-green-100 text-green-700', CLOSED: 'bg-stone-200 text-stone-600' }[status] || 'bg-stone-100');
const pretty = value => value?.replaceAll('_', ' ').toLowerCase().replace(/^./, letter => letter.toUpperCase());

const AttachmentPicker = ({ files, setFiles, disabled }) => (
  <div>
    <label className={`inline-flex items-center gap-2 text-sm border border-stone-200 rounded-lg px-3 py-2 ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-stone-50'}`}>
      <ImagePlus size={16} /> Add images
      <input type="file" accept="image/*" multiple disabled={disabled} className="sr-only" onChange={event => setFiles(previous => [...previous, ...Array.from(event.target.files || [])].slice(0, 5))} />
    </label>
    {files.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{files.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 bg-stone-100 rounded px-2 py-1 text-xs max-w-44"><span className="truncate">{file.name}</span><button type="button" onClick={() => setFiles(items => items.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></span>)}</div>}
  </div>
);

export default function CustomerSupport({ orders = [], commissions = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reply, setReply] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [form, setForm] = useState({ subject: '', category: 'ORDER', message: '', orderId: '', commissionId: '' });
  const [formFiles, setFormFiles] = useState([]);

  const loadTickets = async () => {
    try {
      const { data } = await supportAPI.getTickets();
      setTickets(data.tickets || []);
      const requestedId = searchParams.get('ticket');
      if (requestedId) await openTicket(requestedId, false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load support requests');
    } finally {
      setLoading(false);
    }
  };

  // Initial inbox load; ticket changes are refreshed explicitly after actions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTickets(); }, []);

  const openTicket = async (id, updateUrl = true) => {
    try {
      const { data } = await supportAPI.getTicket(id);
      setSelected(data);
      setShowForm(false);
      if (updateUrl) setSearchParams({ tab: 'support', ticket: id });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not open this support request');
    }
  };

  const upload = async files => {
    if (!files.length) return [];
    const uploaded = await uploadMultipleToCloudinary(files);
    return uploaded.map((item, index) => ({ ...item, name: files[index]?.name }));
  };

  const createTicket = async event => {
    event.preventDefault();
    try {
      setCreating(true);
      const attachments = await upload(formFiles);
      const { data } = await supportAPI.createTicket({ ...form, orderId: form.orderId || null, commissionId: form.commissionId || null, attachments });
      setTickets(items => [data, ...items]);
      setForm({ subject: '', category: 'ORDER', message: '', orderId: '', commissionId: '' });
      setFormFiles([]);
      setShowForm(false);
      await openTicket(data.id);
      toast.success('Support request created');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not create support request');
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async event => {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      setSending(true);
      const attachments = await upload(replyFiles);
      await supportAPI.reply(selected.id, { message: reply, attachments });
      setReply('');
      setReplyFiles([]);
      await openTicket(selected.id, false);
      await loadTickets();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not send reply');
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    try {
      await supportAPI.close(selected.id);
      await openTicket(selected.id, false);
      await loadTickets();
      toast.success('Support request closed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not close request');
    }
  };

  if (loading) return <div className="py-20 grid place-items-center"><Loader className="animate-spin text-amber-700" /></div>;

  if (showForm) return (
    <form onSubmit={createTicket} className="bg-white border border-stone-200 rounded-xl p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-serif">New support request</h1><p className="text-sm text-stone-500 mt-1">Tell us what happened and we’ll keep the conversation here.</p></div><button type="button" onClick={() => setShowForm(false)} className="p-2"><X /></button></div>
      <label className="block text-sm font-medium">Subject<input required minLength="4" maxLength="150" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} className="mt-2 w-full border border-stone-200 rounded-lg p-3" placeholder="How can we help?" /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm font-medium">Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value, orderId: '', commissionId: '' })} className="mt-2 w-full border border-stone-200 rounded-lg p-3 bg-white">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {['ORDER', 'DELIVERY', 'DAMAGE', 'PAYMENT'].includes(form.category) && <label className="block text-sm font-medium">Related order<select value={form.orderId} onChange={event => setForm({ ...form, orderId: event.target.value })} className="mt-2 w-full border border-stone-200 rounded-lg p-3 bg-white"><option value="">None</option>{orders.map(order => <option key={order.id} value={order.id}>#{order.orderNumber}</option>)}</select></label>}
        {form.category === 'COMMISSION' && <label className="block text-sm font-medium">Related commission<select value={form.commissionId} onChange={event => setForm({ ...form, commissionId: event.target.value })} className="mt-2 w-full border border-stone-200 rounded-lg p-3 bg-white"><option value="">None</option>{commissions.map(item => <option key={item.id} value={item.id}>#{item.commissionNumber}</option>)}</select></label>}
      </div>
      <label className="block text-sm font-medium">Details<textarea required minLength="10" rows="6" value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} className="mt-2 w-full border border-stone-200 rounded-lg p-3 resize-y" placeholder="Include any useful dates, payment references or delivery details." /></label>
      <AttachmentPicker files={formFiles} setFiles={setFormFiles} disabled={creating} />
      <button disabled={creating} className="inline-flex items-center gap-2 bg-stone-900 text-white rounded-lg px-5 py-3 disabled:opacity-50">{creating ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Submit request</button>
    </form>
  );

  if (selected) return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-stone-100 flex flex-wrap items-start justify-between gap-3"><div><button onClick={() => { setSelected(null); setSearchParams({ tab: 'support' }); }} className="inline-flex items-center gap-1 text-xs text-stone-500 mb-3"><ArrowLeft size={14} /> All requests</button><h1 className="text-xl font-serif">{selected.subject}</h1><p className="text-xs text-stone-500 mt-1">{selected.ticketNumber} · {pretty(selected.category)}</p></div><div className="flex items-center gap-2"><span className={`text-xs px-2.5 py-1 rounded-full ${statusClass(selected.status)}`}>{pretty(selected.status)}</span>{!['CLOSED'].includes(selected.status) && <button onClick={closeTicket} className="text-xs border rounded-lg px-3 py-1.5 hover:bg-stone-50">Close request</button>}</div></div>
      <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto bg-stone-50">{selected.messages?.map(message => <div key={message.id} className={`flex ${message.authorType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-xl px-4 py-3 ${message.authorType === 'CUSTOMER' ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200'}`}><p className="text-xs opacity-60 mb-1">{message.authorType === 'CUSTOMER' ? 'You' : message.admin?.name || 'Highmarc Support'}</p><p className="text-sm whitespace-pre-wrap leading-6">{message.body}</p>{message.attachments?.length > 0 && <div className="grid grid-cols-2 gap-2 mt-3">{message.attachments.map(file => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.name || 'Support attachment'} className="rounded-lg w-full h-28 object-cover" /></a>)}</div>}<p className="text-[10px] opacity-50 mt-2">{new Date(message.createdAt).toLocaleString()}</p></div></div>)}</div>
      {selected.status !== 'CLOSED' && <form onSubmit={sendReply} className="p-4 border-t border-stone-100 space-y-3"><textarea rows="3" value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a reply…" className="w-full border border-stone-200 rounded-lg p-3 resize-none" /><div className="flex items-end justify-between gap-3"><AttachmentPicker files={replyFiles} setFiles={setReplyFiles} disabled={sending} /><button disabled={sending || !reply.trim()} className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg disabled:opacity-50">{sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Reply</button></div></form>}
    </div>
  );

  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-serif">Support</h1><p className="text-sm text-stone-500 mt-2">Get help with orders, delivery, payments, commissions or your account.</p></div><button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-stone-900 text-white rounded-lg px-4 py-3"><Plus size={17} /> New request</button></div>{tickets.length ? <div className="space-y-3">{tickets.map(ticket => <button key={ticket.id} onClick={() => openTicket(ticket.id)} className="w-full bg-white border border-stone-200 rounded-xl p-5 text-left hover:border-amber-400 transition-colors flex items-center gap-4"><span className="w-10 h-10 bg-amber-50 text-amber-700 rounded-full grid place-items-center"><MessageCircle size={18} /></span><span className="min-w-0 flex-1"><span className="font-medium block truncate">{ticket.subject}</span><span className="text-xs text-stone-500 mt-1 block">{ticket.ticketNumber} · {ticket._count?.messages || 0} messages · Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span></span><span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full ${statusClass(ticket.status)}`}>{pretty(ticket.status)}</span></button>)}</div> : <div className="bg-white border border-stone-200 rounded-xl py-16 text-center"><Paperclip className="mx-auto text-stone-300" size={38} /><h2 className="font-medium mt-4">No support requests</h2><p className="text-sm text-stone-500 mt-2">When you need help, start a request and track every reply here.</p></div>}</div>;
}
