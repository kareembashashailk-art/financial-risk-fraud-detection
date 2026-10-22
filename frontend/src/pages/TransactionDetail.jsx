import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  User,
} from 'lucide-react';
import { transactionsApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RiskBadge, StatusBadge } from '../components/common/Badge';

export const TransactionDetail = () => {
  const { id } = useParams();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTx = async () => {
      setLoading(true);
      try {
        const res = await transactionsApi.getById(id);
        setTx(res.data.transaction);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load transaction details.');
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [id]);

  if (loading) return <LoadingSpinner text="Loading transaction details..." />;

  if (error || !tx) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
        <h2 className="text-lg font-bold mb-2">Transaction Not Found</h2>
        <p className="text-sm">{error || 'Requested transaction does not exist.'}</p>
        <Link
          to="/transactions"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transactions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{tx.id}</h1>
              <RiskBadge level={tx.risk_level} score={tx.risk_score} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Initiated on {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {tx.has_alert && (
          <Link
            to={`/alerts?search=${tx.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all self-start"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Active Suspicious Alert Filed</span>
          </Link>
        )}
      </div>

      {/* Primary Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Transaction Overview */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Financial Attributes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-xs text-slate-500">Transaction Amount</span>
                <div className="text-2xl font-bold text-white mt-1">
                  ${tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-400">{tx.currency}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500">Payment Status</span>
                <div className="mt-1">
                  <StatusBadge status={tx.status} />
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500">Processing Channel</span>
                <div className="text-sm font-semibold text-slate-200 mt-1 capitalize">{tx.channel}</div>
              </div>

              <div>
                <span className="text-xs text-slate-500">Merchant / Counterparty</span>
                <div className="text-sm font-semibold text-white mt-1">{tx.merchant_name || 'N/A'}</div>
                <div className="text-[11px] text-slate-400 capitalize">{tx.merchant_category}</div>
              </div>

              <div>
                <span className="text-xs text-slate-500">Location Origin</span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tx.location || 'Not Specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500">IP Geolocation</span>
                <div className="text-sm font-mono text-slate-300 mt-1">{tx.ip_address || 'Unavailable'}</div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Associated Customer Account
            </h2>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{tx.customer_name || 'Account Holder'}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">{tx.account_id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Score Calculation Breakdown Panel */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Fraud Engine Assessment
            </h2>

            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-center mb-6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Composite Risk Score
              </span>
              <div
                className={`text-5xl font-extrabold my-2 ${
                  tx.risk_level === 'HIGH'
                    ? 'text-rose-500'
                    : tx.risk_level === 'MEDIUM'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {tx.risk_score}
                <span className="text-lg font-normal text-slate-500">/100</span>
              </div>
              <RiskBadge level={tx.risk_level} />
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-400">Scoring Explanation</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aggregated deterministic weight from active detection rules. Transparent scoring capped at 100 with
                boundary validation:
              </p>
              <div className="text-[11px] space-y-1 text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Low Risk Band:</span>
                  <span className="text-emerald-400 font-medium">0 – 29</span>
                </div>
                <div className="flex justify-between">
                  <span>Medium Risk Band:</span>
                  <span className="text-amber-400 font-medium">30 – 59</span>
                </div>
                <div className="flex justify-between">
                  <span>High Risk Band:</span>
                  <span className="text-rose-400 font-medium">60 – 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rule Evaluation Results Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Rule Evaluation Matrix</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual heuristic checks executed for this transaction
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3 pl-4">Rule ID & Name</th>
                <th className="py-3 px-4">Evaluation Outcome</th>
                <th className="py-3 px-4">Weight Contributed</th>
                <th className="py-3 pr-4">Reason / Heuristic Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tx.rule_results && tx.rule_results.length > 0 ? (
                tx.rule_results.map((res) => (
                  <tr
                    key={res.id}
                    className={`transition-colors ${
                      res.is_triggered ? 'bg-rose-950/20' : 'hover:bg-slate-800/20'
                    }`}
                  >
                    <td className="py-3 pl-4 font-medium text-slate-200">
                      <div>{res.rule_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{res.rule_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      {res.is_triggered ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" /> Triggered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {res.is_triggered ? (
                        <span className="text-rose-400">+{res.weight_contributed} pts</span>
                      ) : (
                        <span className="text-slate-500">0 pts</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {res.reason || <span className="text-slate-500 italic">No anomaly detected</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500 italic">
                    No individual rule evaluation logs available for this transaction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
