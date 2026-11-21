import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, BadgePercent, Bell, CalendarClock, Code2, Eye, Loader, Mail, Megaphone, Pencil, Plus, RotateCcw, Send, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketingAPI, notificationsAPI } from '../../services/api';

const blankPromotion = { code: '', name: '', discountType: 'PERCENTAGE', value: '', minimumOrder: '', maximumDiscount: '', usageLimit: '', startsAt: '', endsAt: '', isActive: true, categories: [], artworkIds: [] };
const blankEmail = { name: '', subject: '', htmlBody: '<p>Hello {{firstName}},</p><p></p>', segment: 'VERIFIED' };
const activeCampaignStatuses = new Set(['QUEUED', 'SENDING']);
const campaignSegments = ['VERIFIED', 'ALL', 'CUSTOMERS', 'COMMISSION_CLIENTS', 'RECENT_CUSTOMERS', 'HIGH_VALUE_COLLECTORS', 'INACTIVE_CUSTOMERS'];
const segmentLabels = { VERIFIED: 'Verified subscribers', ALL: 'All marketing subscribers', CUSTOMERS: 'Paid-order customers', COMMISSION_CLIENTS: 'Commission clients', RECENT_CUSTOMERS: 'Recent signups (last 90 days)', HIGH_VALUE_COLLECTORS: 'High-value collectors ($5,000+ purchase)', INACTIVE_CUSTOMERS: 'Inactive customers (180+ days)' };

export default function Marketing() {
  const [tab, setTab] = useState('promotions');
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [promotion, setPromotion] = useState(blankPromotion);
  const [template, setTemplate] = useState(blankEmail);
  const [campaign, setCampaign] = useState(blankEmail);
  const [testEmail, setTestEmail] = useState('');
  const [campaignTestEmail, setCampaignTestEmail] = useState('');
  const [notification, setNotification] = useState({ type: 'SYSTEM', message: '', link: '' });
  const [sending, setSending] = useState('');
  const [confirmCampaign, setConfirmCampaign] = useState(null);
  const [audience, setAudience] = useState({ loading: false, count: 0, samples: [] });
  const [reviewAudience, setReviewAudience] = useState({ loading: false, count: 0, samples: [] });
  const pumping = useRef(false);

  const load = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [promotionsResponse, templatesResponse, campaignsResponse] = await Promise.all([
        marketingAPI.getPromotions(), marketingAPI.getTemplates(), marketingAPI.getCampaigns(),
      ]);
      setPromotions(promotionsResponse.data);
      setTemplates(templatesResponse.data);
      setCampaigns(campaignsResponse.data);
    } catch {
      if (showLoader) toast.error('Failed to load marketing tools');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 'campaigns') return undefined;
    let cancelled = false;
    setAudience(current => ({ ...current, loading: true }));
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await marketingAPI.previewAudience(campaign.segment);
        if (!cancelled) setAudience({ loading: false, ...data });
      } catch {
        if (!cancelled) setAudience({ loading: false, count: 0, samples: [] });
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [campaign.segment, tab]);

  useEffect(() => {
    const active = campaigns.filter(item => activeCampaignStatuses.has(item.status));
    if (!active.length || tab !== 'campaigns') return undefined;
    const timer = window.setInterval(async () => {
      if (pumping.current) return;
      pumping.current = true;
      try {
        await Promise.all(active.map(item => marketingAPI.processCampaign(item.id)));
        await load(false);
      } catch (error) {
        if (error.response?.status !== 409) console.error('Campaign processing failed', error);
      } finally {
        pumping.current = false;
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [campaigns, load, tab]);

  useEffect(() => {
    if (tab !== 'campaigns') return undefined;
    const processDue = async () => {
      const due = campaigns.filter(item => item.status === 'SCHEDULED' && item.scheduledAt && new Date(item.scheduledAt) <= new Date());
      if (!due.length || pumping.current) return;
      pumping.current = true;
      try { await Promise.all(due.map(item => marketingAPI.processCampaign(item.id))); await load(false); }
      catch (error) { console.error('Scheduled campaign activation failed', error); }
      finally { pumping.current = false; }
    };
    processDue();
    const timer = window.setInterval(processDue, 30000);
    return () => window.clearInterval(timer);
  }, [campaigns, load, tab]);

  useEffect(() => {
    if (!confirmCampaign) return undefined;
    const close = event => { if (event.key === 'Escape' && !sending) setConfirmCampaign(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [confirmCampaign, sending]);

  const savePromotion = async () => { try { promotion.id ? await marketingAPI.updatePromotion(promotion.id, promotion) : await marketingAPI.createPromotion(promotion); toast.success('Promotion saved'); setPromotion(blankPromotion); load(); } catch (error) { toast.error(error.response?.data?.error || 'Promotion failed'); } };
  const removePromotion = async id => { if (!window.confirm('Remove this promotion? Used promotions will be deactivated instead.')) return; try { await marketingAPI.deletePromotion(id); toast.success('Promotion removed'); load(); } catch { toast.error('Could not remove promotion'); } };
  const saveTemplate = async () => { try { template.id ? await marketingAPI.updateTemplate(template.id, template) : await marketingAPI.saveTemplate(template); toast.success('Template saved'); setTemplate(blankEmail); load(); } catch (error) { toast.error(error.response?.data?.error || 'Template failed'); } };
  const sendTest = async () => { try { setSending('test'); await marketingAPI.testEmail({ email: testEmail, subject: template.subject, htmlBody: template.htmlBody }); toast.success('Test email delivered'); } catch (error) { toast.error(error.response?.data?.error || 'Test failed'); } finally { setSending(''); } };
  const saveCampaign = async () => { try { campaign.id ? await marketingAPI.updateCampaign(campaign.id, campaign) : await marketingAPI.createCampaign(campaign); toast.success(campaign.id ? 'Campaign draft updated' : 'Campaign saved as draft'); setCampaign(blankEmail); await load(false); } catch (error) { toast.error(error.response?.data?.error || 'Campaign could not be saved'); } };
  const testCampaign = async () => { try { setSending('campaign-test'); await marketingAPI.testEmail({ email: campaignTestEmail, subject: campaign.subject, htmlBody: campaign.htmlBody, firstName: 'Collector' }); toast.success('Campaign test delivered'); } catch (error) { toast.error(error.response?.data?.error || 'Campaign test failed'); } finally { setSending(''); } };
  const applyTemplate = templateId => { const selected = templates.find(item => item.id === templateId); if (selected) setCampaign(current => ({ ...current, name: current.name || selected.name, subject: selected.subject, htmlBody: selected.htmlBody })); };
  const editCampaign = item => { setCampaign({ id: item.id, name: item.name, subject: item.subject, htmlBody: item.htmlBody, segment: item.segment }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCampaignReview = async item => { setConfirmCampaign(item); setReviewAudience({ loading: true, count: 0, samples: [] }); try { const { data } = await marketingAPI.previewAudience(item.segment); setReviewAudience({ loading: false, ...data }); } catch { setReviewAudience({ loading: false, count: 0, samples: [] }); } };
  const sendCampaign = async (item, scheduledAt = null) => { try { setSending(item.id); const payload = scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}; const { data } = await marketingAPI.sendCampaign(item.id, payload); setConfirmCampaign(null); toast.success(data.status === 'SCHEDULED' ? `Campaign scheduled for ${new Date(data.scheduledAt).toLocaleString()}` : `Campaign queued for ${data.recipientCount} recipients`); await load(false); } catch (error) { toast.error(error.response?.data?.error || 'Campaign could not be queued'); } finally { setSending(''); } };
  const unscheduleCampaign = async item => { try { setSending(item.id); await marketingAPI.unscheduleCampaign(item.id); toast.success('Campaign returned to drafts'); await load(false); } catch (error) { toast.error(error.response?.data?.error || 'Schedule could not be cancelled'); } finally { setSending(''); } };
  const retryCampaign = async item => { try { setSending(item.id); await marketingAPI.retryCampaign(item.id); toast.success('Failed deliveries queued for retry'); await load(false); } catch (error) { toast.error(error.response?.data?.error || 'Campaign retry failed'); } finally { setSending(''); } };
  const createNotification = async () => { try { await notificationsAPI.create(notification); toast.success('Admin notification created'); setNotification({ type: 'SYSTEM', message: '', link: '' }); } catch (error) { toast.error(error.response?.data?.error || 'Notification failed'); } };

  if (loading) return <Loader className="animate-spin m-16 mx-auto" />;
  const tabs = [['promotions', BadgePercent, 'Promotions'], ['templates', Mail, 'Templates'], ['campaigns', Megaphone, 'Campaigns'], ['notifications', Bell, 'Notifications']];

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-serif">Marketing & Communications</h1><p className="text-stone-500">Discounts, reusable email content, campaigns and admin alerts.</p></div>
    <div className="flex gap-2 overflow-x-auto">{tabs.map(([key, icon, text]) => <button key={key} onClick={() => setTab(key)} className={`inline-flex gap-2 items-center px-4 py-2 rounded-lg ${tab === key ? 'bg-stone-900 text-white' : 'bg-white border'}`}>{createElement(icon, { size: 16 })}{text}</button>)}</div>

    {tab === 'promotions' && <div className="grid lg:grid-cols-2 gap-5"><Panel title="Create or edit promotion"><div className="grid grid-cols-2 gap-3"><Input label="Code" value={promotion.code} onChange={code => setPromotion({ ...promotion, code: code.toUpperCase() })} /><Input label="Name" value={promotion.name} onChange={name => setPromotion({ ...promotion, name })} /><Select label="Type" value={promotion.discountType} onChange={discountType => setPromotion({ ...promotion, discountType })} options={['PERCENTAGE', 'FIXED']} /><Input label="Value" type="number" value={promotion.value} onChange={value => setPromotion({ ...promotion, value })} /><Input label="Minimum order" type="number" value={promotion.minimumOrder} onChange={minimumOrder => setPromotion({ ...promotion, minimumOrder })} /><Input label="Maximum discount" type="number" value={promotion.maximumDiscount} onChange={maximumDiscount => setPromotion({ ...promotion, maximumDiscount })} /><Input label="Usage limit" type="number" value={promotion.usageLimit} onChange={usageLimit => setPromotion({ ...promotion, usageLimit })} /><label className="text-sm flex items-end gap-2 pb-3"><input type="checkbox" checked={promotion.isActive} onChange={event => setPromotion({ ...promotion, isActive: event.target.checked })} />Active</label><Input label="Starts" type="datetime-local" value={promotion.startsAt?.slice?.(0, 16) || ''} onChange={startsAt => setPromotion({ ...promotion, startsAt })} /><Input label="Ends" type="datetime-local" value={promotion.endsAt?.slice?.(0, 16) || ''} onChange={endsAt => setPromotion({ ...promotion, endsAt })} /></div><button onClick={savePromotion} className="bg-stone-900 text-white px-4 py-2 rounded-lg">Save promotion</button></Panel><Panel title="Promotion codes">{promotions.map(item => <div key={item.id} className="border rounded-lg p-3 flex justify-between mb-2"><button onClick={() => setPromotion({ ...item, startsAt: item.startsAt || '', endsAt: item.endsAt || '' })} className="text-left"><b>{item.code}</b><p className="text-xs text-stone-500">{item.discountType === 'PERCENTAGE' ? `${Number(item.value)}%` : `$${Number(item.value)}`} · {item.usageCount} uses · {item.isActive ? 'Active' : 'Inactive'}</p></button><button onClick={() => removePromotion(item.id)} className="text-red-600"><Trash2 size={16} /></button></div>)}</Panel></div>}

    {tab === 'templates' && <div className="grid lg:grid-cols-2 gap-5"><EmailEditor title="Email template" value={template} setValue={setTemplate} /><Panel title="Saved templates">{templates.map(item => <button key={item.id} onClick={() => setTemplate(item)} className="block w-full text-left border rounded-lg p-3 mb-2"><b>{item.name}</b><p className="text-xs text-stone-500">{item.subject}</p></button>)}<button onClick={saveTemplate} className="mt-3 bg-stone-900 text-white px-4 py-2 rounded-lg">Save template</button><div className="flex gap-2 mt-4"><input value={testEmail} onChange={event => setTestEmail(event.target.value)} placeholder="Test recipient" className="border rounded-lg px-3 flex-1" /><button onClick={sendTest} disabled={sending === 'test'} className="border px-3 rounded-lg">Send test</button></div></Panel></div>}

    {tab === 'campaigns' && <div className="grid lg:grid-cols-2 gap-5"><div className="space-y-4"><Panel title="Campaign setup"><label className="block text-sm mb-3">Start from a saved template<select defaultValue="" onChange={event => { applyTemplate(event.target.value); event.target.value = ''; }} className="block w-full border rounded-lg px-3 py-2 mt-1"><option value="">Choose a template…</option>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm mb-3">Recipient segment<select value={campaign.segment} onChange={event => setCampaign({ ...campaign, segment: event.target.value })} className="block w-full border rounded-lg px-3 py-2 mt-1">{campaignSegments.map(segment => <option key={segment} value={segment}>{segmentLabels[segment]}</option>)}</select></label><AudiencePreview audience={audience} /></Panel><EmailEditor title={campaign.id ? 'Edit campaign draft' : 'New campaign'} value={campaign} setValue={setCampaign} /><Panel title="Test and save"><p className="text-xs text-stone-500 mb-3">Send yourself a personalized copy before saving or queuing the campaign.</p><div className="flex flex-col sm:flex-row gap-2"><input type="email" value={campaignTestEmail} onChange={event => setCampaignTestEmail(event.target.value)} placeholder="Test recipient email" className="border rounded-lg px-3 py-2 flex-1" /><button onClick={testCampaign} disabled={sending === 'campaign-test'} className="border px-4 py-2 rounded-lg inline-flex justify-center items-center gap-2 disabled:opacity-50">{sending === 'campaign-test' ? <Loader className="animate-spin" size={15} /> : <Send size={15} />} Send test</button></div><div className="flex flex-wrap gap-2 mt-4"><button onClick={saveCampaign} className="bg-stone-900 text-white px-4 py-2 rounded-lg"><Plus size={15} className="inline" /> {campaign.id ? 'Update draft' : 'Save draft'}</button>{campaign.id && <button onClick={() => setCampaign(blankEmail)} className="border px-4 py-2 rounded-lg">Cancel editing</button>}</div></Panel></div><Panel title="Campaign delivery">{campaigns.length === 0 && <p className="text-sm text-stone-500">No campaigns yet.</p>}{campaigns.map(item => <CampaignCard key={item.id} item={item} sending={sending} onEdit={() => editCampaign(item)} onSend={() => openCampaignReview(item)} onUnschedule={() => unscheduleCampaign(item)} onRetry={() => retryCampaign(item)} />)}</Panel></div>}

    {tab === 'notifications' && <Panel title="Create an admin notification"><Select label="Type" value={notification.type} onChange={type => setNotification({ ...notification, type })} options={['SYSTEM', 'ORDER', 'COMMISSION', 'MARKETING']} /><Input label="Message" value={notification.message} onChange={message => setNotification({ ...notification, message })} /><Input label="Optional admin link" value={notification.link} onChange={link => setNotification({ ...notification, link })} /><button onClick={createNotification} className="bg-stone-900 text-white px-4 py-2 rounded-lg">Create notification</button></Panel>}

    {confirmCampaign && <CampaignConfirmModal item={confirmCampaign} audience={reviewAudience} busy={sending === confirmCampaign.id} onClose={() => !sending && setConfirmCampaign(null)} onConfirm={scheduledAt => sendCampaign(confirmCampaign, scheduledAt)} />}
  </div>;
}

const statusStyle = { DRAFT: 'bg-stone-100 text-stone-700', SCHEDULED: 'bg-purple-50 text-purple-700', PREPARING: 'bg-blue-50 text-blue-700', QUEUED: 'bg-blue-50 text-blue-700', SENDING: 'bg-amber-50 text-amber-700', COMPLETED: 'bg-green-50 text-green-700', PARTIAL: 'bg-orange-50 text-orange-700', FAILED: 'bg-red-50 text-red-700' };

const CampaignCard = ({ item, sending, onEdit, onSend, onUnschedule, onRetry }) => {
  const processed = item.deliveredCount + item.failedCount + (item.skippedCount || 0);
  const progress = item.recipientCount ? Math.min(100, Math.round((processed / item.recipientCount) * 100)) : 0;
  return <div className="border rounded-xl p-4 mb-3">
    <div className="flex items-start justify-between gap-3"><div><b>{item.name}</b><p className="text-xs text-stone-500 mt-1">{segmentLabels[item.segment] || item.segment.replaceAll('_', ' ')}</p>{item.status === 'SCHEDULED' && <p className="text-xs text-purple-700 mt-1 inline-flex items-center gap-1"><CalendarClock size={13} /> {new Date(item.scheduledAt).toLocaleString()}</p>}</div><span className={`text-[11px] font-medium px-2 py-1 rounded-full ${statusStyle[item.status] || statusStyle.DRAFT}`}>{item.status}</span></div>
    {item.status === 'DRAFT' && <div className="flex gap-4 mt-3"><button onClick={onEdit} className="inline-flex items-center gap-2 text-sm text-stone-600"><Pencil size={15} /> Edit draft</button><button onClick={onSend} disabled={sending === item.id} className="inline-flex items-center gap-2 text-sm text-amber-700 disabled:opacity-50"><Send size={16} /> Review & send</button></div>}
    {item.status === 'SCHEDULED' && <button onClick={onUnschedule} disabled={sending === item.id} className="mt-3 text-xs border rounded-lg px-3 py-2">Cancel schedule & edit</button>}
    {!['DRAFT', 'SCHEDULED'].includes(item.status) && <><div className="h-1.5 rounded-full bg-stone-100 mt-4 overflow-hidden"><div className="h-full bg-amber-600 transition-all" style={{ width: `${progress}%` }} /></div><div className="grid grid-cols-3 gap-2 mt-3 text-xs"><span><b className="block text-green-700">{item.deliveredCount}</b>Delivered</span><span><b className="block text-red-700">{item.failedCount}</b>Failed</span><span><b className="block text-stone-600">{item.skippedCount || 0}</b>Skipped</span></div><p className="text-[11px] text-stone-400 mt-2">{processed} of {item.recipientCount} processed</p></>}
    {['PARTIAL', 'FAILED'].includes(item.status) && item.failedCount > 0 && <button onClick={onRetry} disabled={sending === item.id} className="mt-3 inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-xs disabled:opacity-50"><RotateCcw size={14} /> Retry failed deliveries</button>}
  </div>;
};

const CampaignConfirmModal = ({ item, audience, busy, onClose, onConfirm }) => {
  const [deliveryMode, setDeliveryMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [minimumDate] = useState(() => { const date = new Date(); date.setMinutes(date.getMinutes() + 2 - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); });
  const canSubmit = !busy && !audience.loading && audience.count > 0 && (deliveryMode === 'now' || scheduledAt >= minimumDate);
  return <div className="fixed inset-0 z-50 bg-black/60 p-4 grid place-items-center" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="campaign-confirm-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"><div className="flex items-start justify-between p-6 border-b"><div><p className="text-xs uppercase tracking-[0.2em] text-amber-700">Final review</p><h2 id="campaign-confirm-title" className="font-serif text-2xl mt-1">Send this campaign?</h2></div><button onClick={onClose} disabled={busy} aria-label="Close" className="p-1 text-stone-400"><X size={21} /></button></div><div className="p-6 space-y-5"><div className="rounded-xl bg-stone-50 border p-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-stone-500">Campaign</span><b className="text-right">{item.name}</b></div><div className="flex justify-between gap-4"><span className="text-stone-500">Subject</span><span className="text-right">{item.subject}</span></div><div className="flex justify-between gap-4"><span className="text-stone-500">Audience</span><span className="text-right">{segmentLabels[item.segment] || item.segment}</span></div><div className="flex justify-between gap-4"><span className="text-stone-500">Eligible now</span><b>{audience.loading ? 'Checking…' : audience.count.toLocaleString()}</b></div></div><div><p className="text-sm font-medium mb-2">Delivery time</p><div className="grid grid-cols-2 gap-2"><button onClick={() => setDeliveryMode('now')} className={`border rounded-lg p-3 text-sm ${deliveryMode === 'now' ? 'border-stone-900 bg-stone-50' : ''}`}><Send size={16} className="inline mr-2" />Send now</button><button onClick={() => setDeliveryMode('schedule')} className={`border rounded-lg p-3 text-sm ${deliveryMode === 'schedule' ? 'border-stone-900 bg-stone-50' : ''}`}><CalendarClock size={16} className="inline mr-2" />Schedule</button></div>{deliveryMode === 'schedule' && <input type="datetime-local" min={minimumDate} value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-3" />}</div>{!audience.loading && audience.count === 0 && <p className="text-sm text-red-600">This segment currently has no eligible opted-in recipients.</p>}<div className="flex gap-3 text-sm text-stone-600"><AlertTriangle className="text-amber-600 shrink-0" size={20} /><p>Eligibility and consent are checked again before delivery. Recipient totals may change before a scheduled campaign begins.</p></div></div><div className="flex justify-end gap-3 px-6 py-4 bg-stone-50 border-t"><button onClick={onClose} disabled={busy} className="border rounded-lg px-4 py-2">Keep as draft</button><button onClick={() => onConfirm(deliveryMode === 'schedule' ? scheduledAt : null)} disabled={!canSubmit} className="bg-stone-900 text-white rounded-lg px-4 py-2 inline-flex items-center gap-2 disabled:opacity-40">{busy ? <Loader className="animate-spin" size={16} /> : deliveryMode === 'schedule' ? <CalendarClock size={16} /> : <Send size={16} />}{deliveryMode === 'schedule' ? 'Schedule campaign' : 'Queue campaign'}</button></div></div></div>;
};

const AudiencePreview = ({ audience }) => <div className="rounded-xl border bg-stone-50 p-4"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-sm font-medium"><Users size={16} />Eligible audience</span>{audience.loading ? <Loader size={16} className="animate-spin" /> : <b>{audience.count.toLocaleString()}</b>}</div>{!audience.loading && audience.samples.length > 0 && <div className="mt-3 pt-3 border-t space-y-2">{audience.samples.map(sample => <div key={sample.id} className="flex justify-between gap-3 text-xs"><span className="truncate">{sample.name}</span><span className="text-stone-400 shrink-0">{sample.email}</span></div>)}</div>}{!audience.loading && audience.count === 0 && <p className="text-xs text-amber-700 mt-2">No opted-in customers currently match this segment.</p>}</div>;

const Panel = ({ title, children }) => <section className="bg-white border rounded-xl p-5"><h2 className="font-semibold mb-4">{title}</h2>{children}</section>;
const Input = ({ label, type = 'text', value, onChange }) => <label className="block text-sm mb-3">{label}<input type={type} value={value || ''} onChange={event => onChange(event.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label>;
const Select = ({ label, value, onChange, options }) => <label className="block text-sm mb-3">{label}<select value={value} onChange={event => onChange(event.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1">{options.map(item => <option key={item}>{item}</option>)}</select></label>;
const EmailEditor = ({ title, value, setValue }) => {
  const [mode, setMode] = useState('edit');
  const previewHtml = String(value.htmlBody || '').replaceAll('{{firstName}}', 'Collector');
  return <Panel title={title}><Input label="Internal name" value={value.name} onChange={name => setValue({ ...value, name })} /><Input label="Subject" value={value.subject} onChange={subject => setValue({ ...value, subject })} /><div className="flex items-center justify-between mb-2"><span className="text-sm">Email body (supports {'{{firstName}}'})</span><div className="inline-flex rounded-lg border p-1"><button type="button" onClick={() => setMode('edit')} className={`px-3 py-1 rounded-md text-xs inline-flex items-center gap-1 ${mode === 'edit' ? 'bg-stone-900 text-white' : ''}`}><Code2 size={13} /> Edit</button><button type="button" onClick={() => setMode('preview')} className={`px-3 py-1 rounded-md text-xs inline-flex items-center gap-1 ${mode === 'preview' ? 'bg-stone-900 text-white' : ''}`}><Eye size={13} /> Preview</button></div></div>{mode === 'edit' ? <textarea rows="12" value={value.htmlBody} onChange={event => setValue({ ...value, htmlBody: event.target.value })} className="block w-full font-mono text-xs border rounded-lg p-3" /> : <div className="border rounded-lg overflow-hidden bg-stone-100"><div className="bg-white border-b px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-stone-400">Subject</p><p className="text-sm font-medium mt-1">{value.subject || 'No subject yet'}</p></div><iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="w-full h-96 bg-white" /></div>}</Panel>;
};
