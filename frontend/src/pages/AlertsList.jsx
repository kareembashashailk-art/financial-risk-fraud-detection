import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Clock,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { alertsApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { RiskBadge, StatusBadge, DecisionBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const AlertsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('risk_level') || '');
  const [assignedToMe, setAssignedToMe] = useState(searchParams.get('assigned_to_me') === 'true');
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const { user } = useAuth();
  const { error: notifyError } = useNotification();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getAll({
        page,
        per_page: 15,
        status,
        risk_level: riskLevel,
        assigned_to_me: assignedToMe,
        search,
      });
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      notifyError('Failed to fetch fraud alerts from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, status, riskLevel, assignedToMe]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAlerts();
  };

  const handleResetFilters = () => {
    setStatus('');
    setRiskLevel('');
    setAssignedToMe(false);
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Suspicious Transaction Alerts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated alerts raised by the rule engine requiring analyst investigation and human review.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Alert ID, Transaction ID, or Account ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Review Statuses</option>
              <option value="new">New (Awaiting Triage)</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed / Resolved</option>
            </select>
          </div>

          <div>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 ml-auto bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => {
                setAssignedToMe(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Assigned to me ({user?.username})</span>
          </label>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading suspicious alerts..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 pl-6">Alert ID</th>
                    <th className="py-3.5 px-4">Transaction ID</th>
                    <th className="py-3.5 px-4">Account ID</th>
                    <th className="py-3.5 px-4">Risk Assessment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned Reviewer</th>
                    <th className="py-3.5 px-4">Final Decision</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 pr-6 text-right">Investigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {alerts.length > 0 ? (
                    alerts.map((alt) => (
                      <tr key={alt.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-6 font-mono font-bold text-rose-400">
                          <Link to={`/alerts/${alt.id}`} className="hover:underline">
                            {alt.id}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <Link to={`/transactions/${alt.transaction_id}`} className="hover:text-blue-400 underline">
                            {alt.transaction_id}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{alt.account_id}</td>
                        <td className="py-3.5 px-4">
                          <RiskBadge level={alt.risk_level} score={alt.risk_score} />
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={alt.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {alt.assigned_reviewer_name ? (
                            <span className="text-slate-200 font-medium">{alt.assigned_reviewer_name}</span>
                          ) : (
                            <span className="italic text-slate-500">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <DecisionBadge decision={alt.final_decision} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {alt.created_at ? new Date(alt.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 pr-6 text-right">
                          <Link
                            to={`/alerts/${alt.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
                          >
                            <span>Investigate</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-500 italic">
                        No fraud alerts found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 border-t border-slate-800">
              <Pagination
                currentPage={page}
                totalPages={pages}
                totalItems={total}
                perPage={15}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
