// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Image as ImageIcon, ShoppingBag,
  Palette, DollarSign, ArrowRight, Eye, Loader,
  RefreshCw, Users, Monitor, Smartphone, Tablet,
  Globe, BarChart2, Activity, AlertCircle, WalletCards,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardAPI, analyticsAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ── Simple Bar Chart Component ────────────────────────────────────────────────
const MiniBarChart = ({ data, valueKey = 'views', labelKey = 'date' }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d[valueKey] || 0));

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((item, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1"
          title={`${item[labelKey]}: ${item[valueKey]} views`}
        >
          <div
            className="w-full bg-amber-500 rounded-t-sm transition-all duration-300
                       hover:bg-amber-600"
            style={{
              height: max > 0
                ? `${Math.max(4, (item[valueKey] / max) * 56)}px`
                : '4px',
            }}
          />
        </div>
      ))}
    </div>
  );
};

// ── Donut Chart Component ─────────────────────────────────────────────────────
const DonutChart = ({ data, colors }) => {
  if (!data || data.length === 0) return null;

  const total  = data.reduce((sum, d) => sum + d.count, 0);
  let offset   = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none"
                stroke="#f5f5f4" strokeWidth="12" />
        {data.map((item, i) => {
          const pct  = item.count / total;
          const dash = pct * circumference;
          const gap  = circumference - dash;
          const el   = (
            <circle
              key={i}
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="12"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fontSize="14" fontWeight="bold" fill="#1c1917">
          {total}
        </text>
      </svg>

      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: colors[i % colors.length] }}
            />
            <span className="text-stone-600 capitalize">{item.device || item.browser}</span>
            <span className="text-stone-900 font-medium ml-auto">
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Dashboard Component ──────────────────────────────────────────────────
const Dashboard = () => {
  const [data, setData]               = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [analyticsPeriod, setAnalyticsPeriod]   = useState('7d');

  // ── Fetch dashboard stats ─────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await dashboardAPI.getStats(analyticsPeriod);
      setData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch analytics ───────────────────────────────────────
  const fetchAnalytics = async (period = analyticsPeriod) => {
    setAnalyticsLoading(true);
    try {
      const response = await analyticsAPI.getSummary(period);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, []);

  // Re-fetch analytics when period changes
  useEffect(() => {
    fetchData();
    fetchAnalytics(analyticsPeriod);
  }, [analyticsPeriod]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
      fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, [analyticsPeriod]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader size={32} className="animate-spin text-amber-600" />
      </div>
    );
  }

  // ── Stats cards ───────────────────────────────────────────
  const stats = data ? [
    {
      label: 'Total Revenue',
      value: `$${Number(data.stats?.revenue || 0).toLocaleString()}`,
      icon:  DollarSign,
      color: 'bg-green-500',
      trend: `${data.stats?.trends?.revenue >= 0 ? '+' : ''}${data.stats?.trends?.revenue || 0}%`,
    },
    {
      label: 'Artworks',
      value: data.stats?.artworks || 0,
      icon:  ImageIcon,
      color: 'bg-blue-500',
      trend: 'All inventory',
    },
    {
      label: 'Orders',
      value: data.stats?.orders || 0,
      icon:  ShoppingBag,
      color: 'bg-purple-500',
      trend: `${data.stats?.trends?.orders >= 0 ? '+' : ''}${data.stats?.trends?.orders || 0}%`,
    },
    {
      label: 'Commissions',
      value: data.stats?.commissions || 0,
      icon:  Palette,
      color: 'bg-amber-500',
      trend: `${data.queues?.pendingCommissions || 0} pending`,
    },
  ] : [];

  // ── Style helpers ─────────────────────────────────────────
  const getPaymentBadge = (s) => ({
    UNPAID:       'bg-red-100   text-red-600',
    DEPOSIT_PAID: 'bg-blue-100  text-blue-700',
    FULLY_PAID:   'bg-green-100 text-green-700',
  }[s] || 'bg-stone-100 text-stone-600');

  const getPaymentLabel = (s) => ({
    UNPAID:       'Unpaid',
    DEPOSIT_PAID: 'Deposit Paid',
    FULLY_PAID:   'Fully Paid',
  }[s] || s);

  const getCommissionStatusBadge = (s) => ({
    PENDING:     'bg-yellow-100 text-yellow-700',
    REVIEWING:   'bg-amber-100  text-amber-700',
    ACCEPTED:    'bg-blue-100   text-blue-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    REVISION:    'bg-orange-100 text-orange-700',
    COMPLETED:   'bg-green-100  text-green-700',
    CANCELLED:   'bg-red-100    text-red-700',
  }[s] || 'bg-stone-100 text-stone-700');

  const formatStatus = (s) =>
    s?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

  const deviceColors  = ['#f59e0b', '#1c1917', '#d97706'];
  const browserColors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

  return (
    <div className="space-y-8">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <h2
            className="text-3xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Dashboard Overview
          </h2>
          <p className="text-stone-500 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => { fetchData(); fetchAnalytics(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border
                     border-stone-300 rounded-lg hover:bg-stone-50 text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* ── Stats Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color} shadow-sm`}>
                <stat.icon size={20} className="text-white" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium
                              text-green-600 bg-green-50 px-2 py-0.5 rounded">
                <TrendingUp size={14} />
                {stat.trend}
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mb-1">{stat.value}</p>
            <p className="text-stone-500 text-sm font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Orders awaiting action', value: data?.queues?.pendingOrders || 0, to: '/admin/orders', icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Orders in progress', value: data?.queues?.processingOrders || 0, to: '/admin/orders', icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
          { label: 'Commissions to review', value: data?.queues?.pendingCommissions || 0, to: '/admin/commissions', icon: Palette, color: 'text-blue-600 bg-blue-50' },
          { label: 'Outstanding balances', value: data?.queues?.outstandingBalances || 0, to: '/admin/commissions', icon: WalletCards, color: 'text-red-600 bg-red-50' },
        ].map(item => <Link key={item.label} to={item.to} className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-4 hover:border-amber-400"><div className={`p-3 rounded-lg ${item.color}`}><item.icon size={20}/></div><div><p className="text-2xl font-bold">{item.value}</p><p className="text-sm text-stone-500">{item.label}</p></div></Link>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex justify-between mb-5"><div><h3 className="font-semibold">Revenue trend</h3><p className="text-sm text-stone-500">Paid orders in the selected period</p></div><b>${Number(data?.stats?.revenue || 0).toLocaleString()}</b></div>
          {data?.revenueByDay?.length ? <MiniBarChart data={data.revenueByDay} valueKey="amount" labelKey="date"/> : <p className="text-sm text-stone-400 py-6 text-center">No paid orders in this period.</p>}
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6"><h3 className="font-semibold mb-4">Top selling artworks</h3><div className="space-y-3">{data?.topSellingArtworks?.map((item,i)=><div key={item.id} className="flex gap-3 text-sm"><span className="text-stone-400">{i+1}</span><span className="flex-1 truncate">{item.title}</span><b>{item.sales} sold</b></div>)}{!data?.topSellingArtworks?.length&&<p className="text-sm text-stone-400">No sales yet.</p>}</div></div>
      </div>

      {/* ── Visitor Analytics Section ──────────────────────── */}
      <div className="space-y-6">

        {/* Analytics Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-amber-600" />
            <h3 className="text-lg font-semibold text-stone-900">
              Visitor Analytics
            </h3>
          </div>

          {/* Period Selector */}
          <div className="flex bg-stone-100 rounded-lg p-1 gap-1">
            {['7d', '30d', '90d'].map(period => (
              <button
                key={period}
                onClick={() => setAnalyticsPeriod(period)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  analyticsPeriod === period
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center py-12 bg-white
                          rounded-xl border border-stone-200">
            <Loader size={24} className="animate-spin text-amber-600" />
          </div>
        ) : analytics ? (
          <>
            {/* Analytics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye size={18} className="text-blue-600" />
                  </div>
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    Page Views
                  </span>
                </div>
                <p className="text-3xl font-bold text-stone-900">
                  {analytics.summary?.totalViews?.toLocaleString() || 0}
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  ~{analytics.summary?.avgViewsPerDay || 0} per day
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users size={18} className="text-green-600" />
                  </div>
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    Unique Visitors
                  </span>
                </div>
                <p className="text-3xl font-bold text-stone-900">
                  {analytics.summary?.uniqueVisitors?.toLocaleString() || 0}
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  In the last {analyticsPeriod === '7d' ? '7' : analyticsPeriod === '30d' ? '30' : '90'} days
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <BarChart2 size={18} className="text-amber-600" />
                  </div>
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    Avg Per Day
                  </span>
                </div>
                <p className="text-3xl font-bold text-stone-900">
                  {analytics.summary?.avgViewsPerDay || 0}
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  Views per day average
                </p>
              </motion.div>
            </div>

            {/* Chart + Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Page Views Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border
                              border-stone-200 shadow-sm p-6">
                <h4 className="text-sm font-semibold text-stone-700 mb-4">
                  Daily Page Views
                </h4>
                {analytics.viewsByDay?.length > 0 ? (
                  <>
                    <MiniBarChart
                      data={analytics.viewsByDay}
                      valueKey="views"
                      labelKey="date"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-stone-400">
                        {analytics.viewsByDay?.[0]?.date
                          ? new Date(analytics.viewsByDay[0].date)
                              .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                      <span className="text-xs text-stone-400">
                        {analytics.viewsByDay?.at(-1)?.date
                          ? new Date(analytics.viewsByDay.at(-1).date)
                              .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-16
                                  text-stone-400 text-sm">
                    No data yet — visit your site to start tracking!
                  </div>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="bg-white rounded-xl border border-stone-200
                              shadow-sm p-6">
                <h4 className="text-sm font-semibold text-stone-700 mb-4">
                  Device Breakdown
                </h4>
                {analytics.deviceBreakdown?.length > 0 ? (
                  <DonutChart
                    data={analytics.deviceBreakdown}
                    colors={deviceColors}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center
                                  h-24 text-stone-400">
                    <Monitor size={24} className="mb-2 opacity-50" />
                    <span className="text-sm">No data yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top Pages + Top Artworks + Browser */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Top Pages */}
              <div className="bg-white rounded-xl border border-stone-200
                              shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={16} className="text-stone-400" />
                  <h4 className="text-sm font-semibold text-stone-700">
                    Top Pages
                  </h4>
                </div>
                <div className="space-y-3">
                  {analytics.viewsByPage?.length > 0 ? (
                    analytics.viewsByPage.slice(0, 6).map((page, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-700 truncate font-medium">
                            {page.path === '/' ? 'Home' : page.path}
                          </p>
                          <div className="mt-1 h-1.5 bg-stone-100 rounded-full">
                            <div
                              className="h-1.5 bg-amber-500 rounded-full"
                              style={{
                                width: `${Math.round(
                                  (page.views / analytics.viewsByPage[0].views) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-stone-600 flex-shrink-0">
                          {page.views}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-400 text-sm text-center py-4">
                      No page data yet
                    </p>
                  )}
                </div>
              </div>

              {/* Top Artworks */}
              <div className="bg-white rounded-xl border border-stone-200
                              shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={16} className="text-stone-400" />
                  <h4 className="text-sm font-semibold text-stone-700">
                    Most Viewed Artworks
                  </h4>
                </div>
                <div className="space-y-3">
                  {analytics.topArtworks?.length > 0 ? (
                    analytics.topArtworks.slice(0, 5).map((artwork, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-stone-700 truncate font-medium">
                            {artwork.title}
                          </p>
                          <div className="mt-1 h-1.5 bg-stone-100 rounded-full">
                            <div
                              className="h-1.5 bg-blue-500 rounded-full"
                              style={{
                                width: analytics.topArtworks[0].views > 0
                                  ? `${Math.round(
                                      (artwork.views / analytics.topArtworks[0].views) * 100
                                    )}%`
                                  : '0%',
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-stone-600 flex-shrink-0">
                          {artwork.views}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-400 text-sm text-center py-4">
                      No artwork views yet
                    </p>
                  )}
                </div>
              </div>

              {/* Browser Breakdown */}
              <div className="bg-white rounded-xl border border-stone-200
                              shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor size={16} className="text-stone-400" />
                  <h4 className="text-sm font-semibold text-stone-700">
                    Browsers
                  </h4>
                </div>
                {analytics.browserBreakdown?.length > 0 ? (
                  <DonutChart
                    data={analytics.browserBreakdown}
                    colors={browserColors}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center
                                  h-24 text-stone-400">
                    <Monitor size={24} className="mb-2 opacity-50" />
                    <span className="text-sm">No data yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Events */}
            {analytics.eventCounts?.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200
                              shadow-sm p-6">
                <h4 className="text-sm font-semibold text-stone-700 mb-4">
                  Event Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {analytics.eventCounts.map((evt, i) => (
                    <div
                      key={i}
                      className="bg-stone-50 rounded-lg p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-stone-900">
                        {evt.count}
                      </p>
                      <p className="text-xs text-stone-500 mt-1 capitalize">
                        {evt.event.replace(/_/g, ' ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200
                          shadow-sm p-12 text-center">
            <Activity size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500">
              Analytics data will appear here once visitors start browsing your site.
            </p>
          </div>
        )}
      </div>

      {/* ── Recent Orders & Commissions ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-stone-200
                        shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-stone-200 flex items-center
                          justify-between">
            <h3 className="text-lg text-stone-900 font-semibold">
              Recent Orders
            </h3>
            <Link
              to="/admin/orders"
              className="text-sm text-amber-600 hover:text-amber-700
                         flex items-center gap-1 font-medium"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  {['Order', 'Customer', 'Amount', 'Payment'].map(h => (
                    <th key={h}
                        className="text-left px-6 py-3 text-xs font-semibold
                                   text-stone-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data?.recentOrders?.length > 0 ? (
                  data.recentOrders.map((order) => (
                    <tr key={order.id}
                        className="hover:bg-stone-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/admin/orders/${order.id}`}>
                          <p className="font-medium text-stone-900
                                        group-hover:text-amber-700 text-sm">
                            {order.orderNumber}
                          </p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900 font-medium">
                        ${Number(order.total).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium
                                         ${getPaymentBadge(order.paymentStatus)}`}>
                          {getPaymentLabel(order.paymentStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-stone-500">
                      No recent orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl border border-stone-200
                        shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-stone-200 flex items-center
                          justify-between">
            <h3 className="text-lg text-stone-900 font-semibold">
              Recent Commissions
            </h3>
            <Link
              to="/admin/commissions"
              className="text-sm text-amber-600 hover:text-amber-700
                         flex items-center gap-1 font-medium"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-stone-100 flex-1">
            {data?.recentCommissions?.length > 0 ? (
              data.recentCommissions.map((commission) => (
                <Link
                  key={commission.id}
                  to={`/admin/commissions/${commission.id}`}
                  className="block p-5 hover:bg-stone-50 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-stone-900
                                    group-hover:text-amber-700">
                        {commission.customer?.firstName} {commission.customer?.lastName}
                      </p>
                      <p className="text-xs text-stone-500">{commission.artStyle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs
                                        font-bold uppercase
                                        ${getCommissionStatusBadge(commission.status)}`}>
                        {formatStatus(commission.status)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium
                                        ${getPaymentBadge(commission.paymentStatus)}`}>
                        {getPaymentLabel(commission.paymentStatus)}
                      </span>
                    </div>
                  </div>
                  {commission.finalPrice && (
                    <p className="text-xs text-stone-500 mt-2">
                      Total:{' '}
                      <span className="font-medium">
                        ${Number(commission.finalPrice).toLocaleString()}
                      </span>
                    </p>
                  )}
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-stone-500">
                No recent commissions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/admin/artworks/new', icon: ImageIcon, label: 'Add Artwork'       },
            { to: '/admin/orders',       icon: ShoppingBag, label: 'Manage Orders'   },
            { to: '/admin/commissions',  icon: Palette,    label: 'View Commissions' },
            { to: '/', target: '_blank', icon: Eye,        label: 'View Website'     },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.to}
              target={action.target}
              className="p-4 border border-stone-200 rounded-lg hover:border-amber-500
                         hover:shadow-md transition-all text-center group
                         bg-stone-50 hover:bg-white"
            >
              <action.icon
                size={24}
                className="mx-auto mb-2 text-stone-400
                           group-hover:text-amber-600 transition-colors"
              />
              <p className="font-medium text-stone-900 text-sm">{action.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
