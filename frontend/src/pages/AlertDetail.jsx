import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Clock,
  History,
  Send,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { alertsApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { RiskBadge, StatusBadge, DecisionBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const AlertDetail = () => {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Review Form state
  const [newStatus, setNewStatus] = useState('');
  const [decision, setDecision] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const { canReviewAlerts, user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const fetchAlert = async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getById(id);
      setAlert(res.data.alert);
      setNewStatus(res.data.alert.status);
      setDecision(res.data.alert.final_decision || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load alert details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlert();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newStatus && !decision && !reviewNote.trim()) {
      notifyError('Please specify a status update, decision, or review note.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        status: newStatus || undefined,
        decision: decision || undefined,
        note: reviewNote.trim() || undefined,
      };
      const res = await alertsApi.review(id, payload);
      setAlert(res.data.alert);
      setReviewNote('');
      success('Review decision and status recorded successfully.');
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to record review update.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimAlert = async () => {
    if (!user) return;
    try {
      await alertsApi.assign(id, user.id);
      success(`Alert assigned to ${user.username}.`);
      fetchAlert();
    } catch (err) {
      notifyError('Failed to assign alert.');
    }
  };

  if (loading) return <LoadingSpinner text="Loading alert investigation..." />;

  if (error || !alert) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
        <h2 className="text-lg font-bold mb-2">Alert Not Found</h2>
        <p className="text-sm">{error || 'Requested alert does not exist.'}</p>
        <Link
          to="/alerts"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Alerts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/alerts"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-white font-mono">{alert.id}</h1>
              <RiskBadge level={alert.risk_level} score={alert.risk_score} />
              <StatusBadge status={alert.status} />
              <DecisionBadge decision={alert.final_decision} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Generated on {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        {canReviewAlerts && !alert.assigned_reviewer_id && (
          <button
            onClick={handleClaimAlert}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all self-start"
          >
            <UserCheck className="w-4 h-4 text-blue-400" />
            <span>Assign to Me</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Incident Details & Triggered Rule Reasons */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Summary */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Flagged Transaction Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-slate-500">Transaction ID</span>
                <div className="font-mono text-sm font-bold text-white mt-0.5">
                  <Link
                    to={`/transactions/${alert.transaction_id}`}
                    className="hover:text-blue-400 flex items-center gap-1 group"
                  >
                    <span>{alert.transaction_id}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                  </Link>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Account ID</span>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{alert.account_id}</div>
                <div className="text-[11px] text-slate-400 truncate">{alert.customer_name}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Amount</span>
                <div className="text-sm font-bold text-white mt-0.5">
                  ${alert.transaction_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-slate-400">{alert.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Triggered Rule Explanations */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Triggered Fraud Rule Reasons
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic detection rules violated by this financial event:
            </p>
            <div className="space-y-2.5 mt-3">
              {alert.triggered_rule_reasons && alert.triggered_rule_reasons.length > 0 ? (
                alert.triggered_rule_reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{reason}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-slate-800 text-slate-400 text-xs italic">
                  No specific rule reason text recorded.
                </div>
              )}
            </div>
          </div>

          {/* Review History / Timeline */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Investigation Audit History
              </h2>
            </div>

            <div className="space-y-4 pt-2">
              {alert.review_history && alert.review_history.length > 0 ? (
                alert.review_history.map((h) => (
                  <div key={h.id} className="relative pl-6 pb-2 border-l border-slate-800 last:border-none">
                    <span className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-900" />
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{h.reviewer_username}</span> updated status to{' '}
                      <span className="font-semibold text-blue-400 capitalize">{h.new_status}</span>
                      {h.decision && (
                        <span>
                          {' '}
                          with decision <span className="font-semibold text-rose-400">{h.decision}</span>
                        </span>
                      )}
                      <span className="text-slate-500 ml-2">
                        • {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    {h.note && (
                      <p className="mt-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                        {h.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">
                  No prior review decisions logged for this alert.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Analyst Review & Decision Action Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Review Decision Workflow
              </h2>
              <span className="text-[11px] text-slate-400">Human Triage</span>
            </div>

            {!canReviewAlerts ? (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Your account has Read-Only permissions. Review decisions and status transitions require a Risk
                  Analyst or Super Admin role.
                </span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Status selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Investigation Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="new">New (Awaiting Triage)</option>
                    <option value="under_review">Under Review</option>
                    <option value="escalated">Escalated to Senior Fraud Specialist</option>
                    <option value="closed">Closed / Investigation Resolved</option>
                  </select>
                </div>

                {/* Final Decision Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Final Review Decision
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- No Decision Yet (Ongoing) --</option>
                    <option value="confirmed_suspicious">Confirmed Suspicious (Fraud Action Taken)</option>
                    <option value="false_positive">False Positive (Authorized Activity)</option>
                    <option value="needs_further_investigation">
                      Needs Further Investigation (Request KYC / Contact User)
                    </option>
                  </select>
                </div>

                {/* Reviewer Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Reviewer Notes / Findings
                  </label>
                  <textarea
                    rows={4}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Enter investigative rationale, customer contact outcome, or remediation notes..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Record Decision & Update'}</span>
                </button>
              </form>
            )}

            {/* Existing Notes Display */}
            {alert.reviewer_notes && (
              <div className="pt-4 border-t border-slate-800">
                <span className="text-xs font-semibold uppercase text-slate-400 block mb-2">
                  All Review Notes Logged
                </span>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {alert.reviewer_notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
