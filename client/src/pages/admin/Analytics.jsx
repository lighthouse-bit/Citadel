import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, DollarSign,
  Eye, Loader2, Megaphone, Palette, RefreshCw, ShoppingBag, ShoppingCart,
  UserCheck, Users, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../services/api';

const periods = [
  ['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['365d', '1 year'],
];
const money = value => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const number = value => Number(value || 0).toLocaleString();
const labelize = value => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());

export default function Analytics() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getComprehensive(period);
      setData(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        window.location.assign('/admin/login');
        return;
      }
      toast.error(error.response?.data?.error || 'Analytics could not be loaded');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => data ? [
    [DollarSign, 'Total revenue', money(data.overview.revenue), data.overview.trends.revenue],
    [ShoppingBag, 'Paid orders', number(data.overview.orders), data.overview.trends.orders],
    [Users, 'Unique visitors', number(data.overview.visitors), data.overview.trends.visitors],
    [UserCheck, 'New customers', number(data.overview.newCustomers), data.overview.trends.customers],
  ] : [], [data]);

  if (loading && !data) return <div className="min-h-[55vh] grid place-items-center"><Loader2 className="animate-spin text-amber-700" size={34} /></div>;
  if (!data) return <EmptyState retry={load} />;

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[.2em] text-amber-700 font-semibold">Business intelligence</p>
        <h1 className="text-3xl font-serif mt-1">Comprehensive Analytics</h1>
        <p className="text-stone-500 mt-1">Revenue, customers, traffic, sales, commissions and marketing in one place.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border bg-white p-1 overflow-x-auto">
          {periods.map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm transition ${period === value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{label}</button>)}
        </div>
        <button onClick={load} disabled={loading} className="p-3 border rounded-xl bg-white hover:bg-stone-50 disabled:opacity-50" aria-label="Refresh analytics"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
      </div>
    </header>

    {data.partial && <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">Most analytics loaded, but {data.unavailableMetrics.length} data {data.unavailableMetrics.length === 1 ? 'source is' : 'sources are'} temporarily unavailable. Available figures are shown below.</div>}

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(([icon, label, value, trend]) => <MetricCard key={label} icon={icon} label={label} value={value} trend={trend} />)}
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MiniMetric label="Average order" value={money(data.overview.averageOrderValue)} />
      <MiniMetric label="Visitor conversion" value={`${data.overview.conversionRate}%`} />
      <MiniMetric label="Views per visitor" value={data.traffic.averageViewsPerVisitor} />
      <MiniMetric label="Verified customers" value={`${data.customers.verificationRate}%`} />
    </div>

    <section className="bg-white border rounded-2xl p-5 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div><h2 className="font-semibold text-lg">Performance trend</h2><p className="text-sm text-stone-500">Daily revenue with visitor activity across the selected period.</p></div>
        <div className="flex gap-4 text-xs text-stone-500"><Legend color="bg-amber-600" label="Revenue" /><Legend color="bg-stone-300" label="Visitors" /></div>
      </div>
      <TrendChart points={data.timeline} />
    </section>

    <div className="grid xl:grid-cols-3 gap-5">
      <Panel title="Conversion funnel" subtitle="From artwork interest to tracked purchase" icon={ShoppingCart}>
        <div className="space-y-4">{data.funnel.map((step, index) => <ProgressRow key={step.key} label={step.label} value={step.count} percent={step.rateFromTop} detail={index ? `${step.rateFromPrevious}% from previous` : 'Starting point'} />)}</div>
      </Panel>
      <Panel title="Revenue mix" subtitle="Cash received in this period" icon={DollarSign}>
        <DonutLike rows={[["Artwork orders", data.revenue.orderRevenue], ["Commissions", data.revenue.commissionRevenue]]} formatter={money} />
        <div className="grid grid-cols-2 gap-3 mt-5"><MiniMetric label="Unique buyers" value={number(data.revenue.uniqueBuyers)} /><MiniMetric label="Outstanding commissions" value={number(data.commerce.outstandingCommissions)} /></div>
      </Panel>
      <Panel title="Customer base" subtitle="Account quality and reach" icon={Users}>
        <div className="space-y-3">
          <StatRow label="All customers" value={number(data.customers.total)} />
          <StatRow label="Verified" value={number(data.customers.verified)} />
          <StatRow label="Marketing subscribers" value={number(data.customers.marketingSubscribers)} />
          <StatRow label="New in this period" value={number(data.customers.new)} />
          <StatRow label="Abandoned cart customers" value={number(data.commerce.abandonedCartCustomers)} warn />
        </div>
      </Panel>
    </div>

    <div className="grid xl:grid-cols-2 gap-5">
      <Panel title="Top pages" subtitle={`${number(data.traffic.totalViews)} total consented page views`} icon={Eye}>
        <RankedBars rows={data.traffic.topPages.map(item => ({ label: item.path, value: item.views }))} />
      </Panel>
      <Panel title="Device distribution" subtitle="How visitors access the storefront" icon={BarChart3}>
        <DonutLike rows={data.traffic.devices.map(item => [labelize(item.label), item.count])} formatter={number} />
      </Panel>
    </div>

    <div className="grid xl:grid-cols-2 gap-5">
      <Panel title="Top-selling artworks" subtitle="Ranked by paid order revenue" icon={Palette}>
        <SimpleTable headers={['Artwork', 'Sales', 'Revenue']} rows={data.topArtworks.map(item => [item.title, number(item.sales), money(item.revenue)])} />
      </Panel>
      <Panel title="Operational pipeline" subtitle="Orders and bespoke commissions created in this period" icon={CheckCircle2}>
        <div className="grid md:grid-cols-2 gap-5"><StatusList title="Orders" items={data.commerce.orderStatuses} /><StatusList title="Commissions" items={data.commissions.statuses} /></div>
      </Panel>
    </div>

    <div className="grid xl:grid-cols-2 gap-5">
      <Panel title="Campaign engagement" subtitle={`${number(data.marketing.campaigns)} campaigns sent in this period`} icon={Megaphone}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniMetric label="Recipients" value={number(data.marketing.recipients)} />
          <MiniMetric label="Delivery rate" value={`${data.marketing.deliveryRate}%`} />
          <MiniMetric label="Open rate" value={`${data.marketing.openRate}%`} />
          <MiniMetric label="Click rate" value={`${data.marketing.clickRate}%`} />
        </div>
      </Panel>
      <Panel title="Automation health" subtitle="Lifecycle emails processed in this period" icon={Zap}>
        <div className="grid grid-cols-3 gap-3"><MiniMetric label="Sent" value={number(data.marketing.automations.sent)} /><MiniMetric label="Pending" value={number(data.marketing.automations.pending)} /><MiniMetric label="Failed" value={number(data.marketing.automations.failed)} danger={data.marketing.automations.failed > 0} /></div>
      </Panel>
    </div>

    <p className="text-xs text-stone-500 bg-stone-50 border rounded-xl p-4">Traffic and funnel figures include visitors who consented to optional analytics. Revenue uses fully paid orders and recorded commission receipts. Last refreshed {new Date(data.generatedAt).toLocaleString()}.</p>
  </div>;
}

function MetricCard({ icon, label, value, trend }) {
  const positive = trend >= 0;
  return <div className="bg-white border rounded-2xl p-5"><div className="flex items-start justify-between"><span className="p-2.5 bg-amber-50 text-amber-800 rounded-xl">{createElement(icon, { size: 20 })}</span><span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-700' : 'text-red-600'}`}>{createElement(positive ? ArrowUpRight : ArrowDownRight, { size: 14 })}{Math.abs(trend)}%</span></div><p className="text-sm text-stone-500 mt-4">{label}</p><p className="text-2xl font-bold mt-1">{value}</p><p className="text-[11px] text-stone-400 mt-1">vs previous equal period</p></div>;
}

const MiniMetric = ({ label, value, danger = false }) => <div className={`rounded-xl border p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-stone-50'}`}><p className="text-xs text-stone-500">{label}</p><p className={`font-bold mt-1 ${danger ? 'text-red-700' : ''}`}>{value}</p></div>;
const Panel = ({ title, subtitle, icon, children }) => <section className="bg-white border rounded-2xl p-5 lg:p-6"><div className="flex gap-3 mb-5"><span className="p-2 bg-stone-100 rounded-lg h-fit">{createElement(icon, { size: 18 })}</span><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-stone-500 mt-0.5">{subtitle}</p></div></div>{children}</section>;
const Legend = ({ color, label }) => <span className="inline-flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-full ${color}`} />{label}</span>;
const StatRow = ({ label, value, warn }) => <div className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0"><span className="text-sm text-stone-600">{label}</span><b className={warn ? 'text-amber-700' : ''}>{value}</b></div>;

function TrendChart({ points }) {
  const compact = points.length > 100 ? points.filter((_, index) => index % Math.ceil(points.length / 90) === 0 || index === points.length - 1) : points;
  const maxRevenue = Math.max(...compact.map(item => item.revenue), 1);
  const maxVisitors = Math.max(...compact.map(item => item.visitors), 1);
  const coordinates = compact.map((item, index) => `${(index / Math.max(compact.length - 1, 1)) * 100},${92 - (item.revenue / maxRevenue) * 80}`).join(' ');
  return <div><div className="h-56 flex items-end gap-px border-b border-l relative overflow-hidden bg-[linear-gradient(to_bottom,transparent_24%,#e7e5e4_25%,transparent_26%,transparent_49%,#e7e5e4_50%,transparent_51%,transparent_74%,#e7e5e4_75%,transparent_76%)]">
    {compact.map(item => <div key={item.date} title={`${item.date}: ${money(item.revenue)}, ${item.visitors} visitors`} className="flex-1 bg-stone-200 rounded-t min-w-px" style={{ height: `${Math.max(1, item.visitors / maxVisitors * 88)}%` }} />)}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none"><polyline points={coordinates} fill="none" stroke="#b45309" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
  </div><div className="flex justify-between text-[10px] text-stone-400 mt-2"><span>{points[0]?.date}</span><span>{points.at(-1)?.date}</span></div></div>;
}

function ProgressRow({ label, value, percent, detail }) {
  return <div><div className="flex justify-between text-sm"><span>{label}</span><b>{number(value)}</b></div><div className="h-2 bg-stone-100 rounded-full my-1.5 overflow-hidden"><div className="h-full bg-amber-600 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} /></div><div className="flex justify-between text-[11px] text-stone-400"><span>{detail}</span><span>{percent}% of top</span></div></div>;
}

function DonutLike({ rows, formatter }) {
  const total = rows.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  return <div className="space-y-3">{rows.length ? rows.map(([label, value], index) => <div key={label}><div className="flex justify-between text-sm"><span className="flex items-center gap-2"><i className={`w-2.5 h-2.5 rounded-full ${index % 2 ? 'bg-stone-400' : 'bg-amber-600'}`} />{label}</span><b>{formatter(value)}</b></div><div className="h-1.5 bg-stone-100 rounded-full mt-2"><div className={`${index % 2 ? 'bg-stone-400' : 'bg-amber-600'} h-full rounded-full`} style={{ width: `${total ? Number(value) / total * 100 : 0}%` }} /></div></div>) : <NoData />}</div>;
}

function RankedBars({ rows }) {
  const max = Math.max(...rows.map(item => item.value), 1);
  return rows.length ? <div className="space-y-3">{rows.map(item => <div key={item.label}><div className="flex justify-between gap-3 text-sm"><span className="truncate" title={item.label}>{item.label}</span><b>{number(item.value)}</b></div><div className="h-1.5 bg-stone-100 rounded-full mt-1.5"><div className="h-full bg-stone-800 rounded-full" style={{ width: `${item.value / max * 100}%` }} /></div></div>)}</div> : <NoData />;
}

function StatusList({ title, items }) {
  const rows = Object.entries(items);
  return <div><h3 className="text-xs uppercase tracking-wider text-stone-400 mb-3">{title}</h3>{rows.length ? <div className="space-y-2">{rows.map(([label, value]) => <StatRow key={label} label={labelize(label)} value={number(value)} />)}</div> : <NoData />}</div>;
}

function SimpleTable({ headers, rows }) {
  return rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-stone-500 border-b">{headers.map(header => <th key={header} className="text-left font-medium py-2 pr-3">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-b last:border-0">{row.map((cell, cellIndex) => <td key={cellIndex} className={`py-3 pr-3 ${cellIndex ? 'font-medium' : ''}`}>{cell}</td>)}</tr>)}</tbody></table></div> : <NoData />;
}

const NoData = () => <p className="text-sm text-stone-400 py-6 text-center">No data in this period.</p>;
const EmptyState = ({ retry }) => <div className="bg-white border rounded-2xl p-12 text-center"><BarChart3 className="mx-auto text-stone-300" size={42} /><h1 className="font-serif text-2xl mt-4">Analytics unavailable</h1><button onClick={retry} className="mt-4 bg-stone-900 text-white px-4 py-2 rounded-lg">Try again</button></div>;
