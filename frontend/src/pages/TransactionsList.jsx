import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { transactionsApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { RiskBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const TransactionsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [riskLevel, setRiskLevel] = useState(searchParams.get('risk_level') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [minAmount, setMinAmount] = useState(searchParams.get('min_amount') || '');
  const [maxAmount, setMaxAmount] = useState(searchParams.get('max_amount') || '');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');

  // Simulation modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [simForm, setSimForm] = useState({
    account_id: 'ACC-001',
    amount: '12500.00',
    currency: 'USD',
    merchant_name: 'Luxury Crypto Exchange',
    merchant_category: 'crypto',
    channel: 'online',
    status: 'completed',
    location: 'Tor Exit Node',
  });
  const [simulating, setSimulating] = useState(false);

  const { canReviewAlerts } = useAuth();
  const { success, error: notifyError } = useNotification();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        search,
        risk_level: riskLevel,
        status,
        min_amount: minAmount ? parseFloat(minAmount) : undefined,
        max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      const res = await transactionsApi.getAll(params);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      notifyError('Failed to fetch transactions from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, riskLevel, status, sortBy, sortDir]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRiskLevel('');
    setStatus('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('timestamp');
    setSortDir('desc');
    setPage(1);
  };

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await transactionsApi.create(simForm);
      success(
        `Transaction simulated! Risk Score: ${res.data.transaction.risk_score} (${res.data.transaction.risk_level})${
          res.data.alert_generated ? ' • Alert Generated!' : ''
        }`
      );
      setShowSimModal(false);
      fetchTransactions();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to simulate transaction.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Financial Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, and inspect financial transaction streams and rule engine outcomes.
          </p>
        </div>
        {canReviewAlerts && (
          <button
            onClick={() => setShowSimModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Simulate Transaction</span>
          </button>
        )}
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
              placeholder="Search by Transaction ID or Account ID..."
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

        {/* Filter controls row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Risk Tier</label>
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Risk Tiers</option>
              <option value="LOW">Low (0-29)</option>
              <option value="MEDIUM">Medium (30-59)</option>
              <option value="HIGH">High (60-100)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Min Amount ($)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Max Amount ($)</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching transactions..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 pl-6">Transaction ID</th>
                    <th className="py-3.5 px-4">Account</th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('timestamp')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Timestamp</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('amount')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Amount</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4">Merchant & Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                      onClick={() => toggleSort('risk_score')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Risk Score</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3.5 pr-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-6 font-mono font-medium text-slate-200">
                          <Link
                            to={`/transactions/${tx.id}`}
                            className="hover:text-blue-400 flex items-center gap-1.5 group"
                          >
                            <span>{tx.id}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <div>{tx.account_id}</div>
                          {tx.customer_name && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                              {tx.customer_name}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{tx.merchant_name || 'N/A'}</div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {tx.merchant_category || 'general'} • {tx.channel || 'online'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          <RiskBadge level={tx.risk_level} score={tx.risk_score} />
                        </td>
                        <td className="py-3.5 pr-6 text-right">
                          <Link
                            to={`/transactions/${tx.id}`}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-500 italic">
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

      {/* Interactive Simulation Modal */}
      <Modal
        isOpen={showSimModal}
        onClose={() => setShowSimModal(false)}
        title="Simulate New Financial Transaction"
      >
        <form onSubmit={handleSimulateSubmit} className="space-y-4">
          <p className="text-xs text-slate-400 mb-2">
            Submit a synthetic transaction to evaluate fraud rules in real time. The backend will calculate risk
            scores and raise alerts immediately if criteria are satisfied.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account ID *</label>
              <input
                type="text"
                required
                value={simForm.account_id}
                onChange={(e) => setSimForm({ ...simForm, account_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={simForm.amount}
                onChange={(e) => setSimForm({ ...simForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Merchant Name</label>
              <input
                type="text"
                value={simForm.merchant_name}
                onChange={(e) => setSimForm({ ...simForm, merchant_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Merchant Category</label>
              <select
                value={simForm.merchant_category}
                onChange={(e) => setSimForm({ ...simForm, merchant_category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              >
                <option value="groceries">Groceries</option>
                <option value="retail">Retail</option>
                <option value="electronics">Electronics</option>
                <option value="crypto">Crypto (Restricted)</option>
                <option value="gambling">Gambling (Restricted)</option>
                <option value="travel">Travel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Channel</label>
              <select
                value={simForm.channel}
                onChange={(e) => setSimForm({ ...simForm, channel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              >
                <option value="online">Online</option>
                <option value="in_store">In-Store Point of Sale</option>
                <option value="atm">ATM Withdrawal</option>
                <option value="wire">Wire Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={simForm.location}
                onChange={(e) => setSimForm({ ...simForm, location: e.target.value })}
                placeholder="e.g. New York, US or Tor Exit Node"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSimModal(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={simulating}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {simulating ? 'Evaluating...' : 'Run Fraud Engine'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
