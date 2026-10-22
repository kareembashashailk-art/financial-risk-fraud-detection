import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ReceiptText,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle,
  FileCheck2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { dashboardApi } from '../api';
import { StatCard } from '../components/common/StatCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RiskBadge, StatusBadge } from '../components/common/Badge';
import { VolumeChart } from '../components/charts/VolumeChart';
import { RiskDistributionChart } from '../components/charts/RiskDistributionChart';
import { RulesTriggeredChart } from '../components/charts/RulesTriggeredChart';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recent, setRecent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, chartsRes, recentRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getCharts(),
        dashboardApi.getRecentSuspicious(),
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
      setRecent(recentRes.data);
    } catch (err) {
      setError('Failed to load dashboard metrics from backend API. Please ensure server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Computing real-time risk statistics..." />;
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
        <div className="font-semibold text-lg mb-2">Error Loading Dashboard</div>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Risk Monitoring Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time heuristic evaluation, behavioral anomaly indicators, and alert triage.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium self-start transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Summary Cards Grid (6 cards required by prompt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Transactions"
          value={stats?.total_transactions}
          subtitle="Processed in system"
          icon={ReceiptText}
          color="blue"
        />
        <StatCard
          title="Total Alerts"
          value={stats?.total_alerts}
          subtitle="Triggered by rules"
          icon={AlertTriangle}
          color="rose"
          alert={stats?.total_alerts > 0}
        />
        <StatCard
          title="High-Risk"
          value={stats?.high_risk_transactions}
          subtitle="Score 60 - 100"
          icon={ShieldAlert}
          color="rose"
        />
        <StatCard
          title="Awaiting Review"
          value={stats?.awaiting_review}
          subtitle="Pending investigator"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Reviewed Alerts"
          value={stats?.reviewed_alerts}
          subtitle="Resolved decisions"
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="False Positives"
          value={stats?.false_positives}
          subtitle="Legitimate transactions"
          icon={FileCheck2}
          color="purple"
        />
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Transaction & Alert Velocity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily volume trends over the past 14 days</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Live Timeline</span>
            </div>
          </div>
          <VolumeChart timeline={charts?.timeline || []} />
        </div>

        {/* Risk Level Distribution */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Risk Tier Distribution</h2>
            <p className="text-xs text-slate-400 mt-0.5">Calculated score breakdown</p>
          </div>
          <RiskDistributionChart distribution={charts?.risk_distribution || {}} />
          <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-slate-800/80 text-center">
            <div>
              <div className="text-[11px] text-slate-400">Low (0-29)</div>
              <div className="text-sm font-bold text-emerald-400">{charts?.risk_distribution?.LOW || 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Med (30-59)</div>
              <div className="text-sm font-bold text-amber-400">{charts?.risk_distribution?.MEDIUM || 0}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">High (60+)</div>
              <div className="text-sm font-bold text-rose-400">{charts?.risk_distribution?.HIGH || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Triggered Rules Frequency & Alert Decisions breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <h2 className="text-base font-semibold text-white mb-1">Most Triggered Detection Rules</h2>
          <p className="text-xs text-slate-400 mb-4">Frequency ranking across all evaluated transactions</p>
          <RulesTriggeredChart rules={charts?.rules_triggered || []} />
        </div>

        {/* Recent Suspicious Transactions Table */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Recent Suspicious Transactions</h2>
                <p className="text-xs text-slate-400 mt-0.5">Latest high & medium risk events requiring triage</p>
              </div>
              <Link
                to="/transactions?risk_level=HIGH"
                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="pb-3 pl-1">Tx ID</th>
                    <th className="pb-3">Account</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Risk Tier</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recent?.recent_flagged_transactions?.length > 0 ? (
                    recent.recent_flagged_transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pl-1 font-mono font-medium text-slate-200">{tx.id}</td>
                        <td className="py-3 text-slate-300">{tx.account_id}</td>
                        <td className="py-3 font-semibold text-white">
                          ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3">
                          <RiskBadge level={tx.risk_level} score={tx.risk_score} />
                        </td>
                        <td className="py-3 pr-1 text-right">
                          <Link
                            to={`/transactions/${tx.id}`}
                            className="px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 font-medium transition-all"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500 italic">
                        No suspicious transactions detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
