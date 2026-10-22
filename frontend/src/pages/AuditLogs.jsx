import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldAlert, Clock, Eye } from 'lucide-react';
import { auditApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { useNotification } from '../context/NotificationContext';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actor, setActor] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);

  const { error: notifyError } = useNotification();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getAll({
        page,
        per_page: 20,
        action,
        target_type: targetType,
        actor,
      });
      setLogs(res.data.audit_logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      notifyError('Failed to fetch audit log entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action, targetType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Security & Regulatory Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable log of user authentication events, rule configuration edits, alert decisions, and batch operations.
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
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Search by actor username..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">All Audit Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="ALERT_DECISION">ALERT_DECISION</option>
            <option value="ALERT_STATUS_CHANGE">ALERT_STATUS_CHANGE</option>
            <option value="ALERT_ASSIGN">ALERT_ASSIGN</option>
            <option value="RULE_UPDATE">RULE_UPDATE</option>
            <option value="RULE_TOGGLE">RULE_TOGGLE</option>
            <option value="RULE_CREATE">RULE_CREATE</option>
            <option value="TRANSACTION_IMPORT">TRANSACTION_IMPORT</option>
            <option value="USER_CREATE">USER_CREATE</option>
            <option value="USER_UPDATE">USER_UPDATE</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">All Target Types</option>
            <option value="alert">Alerts</option>
            <option value="rule">Rules</option>
            <option value="transaction">Transactions</option>
            <option value="user">Users</option>
            <option value="auth">Authentication</option>
            <option value="csv_import">CSV Ingestion</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching immutable audit records..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 pl-6">Timestamp (UTC)</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target Type & ID</th>
                    <th className="py-3.5 px-4">IP Address</th>
                    <th className="py-3.5 pr-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pl-6 font-mono text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-200">{log.actor_username}</span>
                          {log.actor_role && (
                            <span className="text-[10px] text-slate-500 block uppercase">
                              {log.actor_role}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                              log.action.includes('FAILED')
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : log.action.includes('DECISION') || log.action.includes('RULE')
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="capitalize">{log.target_type || 'system'}</span>
                          {log.target_id && (
                            <span className="font-mono text-xs text-slate-400 block">{log.target_id}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{log.ip_address || 'Internal'}</td>
                        <td className="py-3.5 pr-6 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500 italic">
                        No audit records matched query.
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
                perPage={20}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record #${selectedLog.id}: ${selectedLog.action}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Actor</span>
                <div className="font-semibold text-white mt-0.5">
                  {selectedLog.actor_username} ({selectedLog.actor_role})
                </div>
              </div>
              <div>
                <span className="text-slate-500">Timestamp</span>
                <div className="font-semibold text-white mt-0.5">
                  {new Date(selectedLog.timestamp).toISOString()}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Target</span>
                <div className="font-semibold text-white mt-0.5">
                  {selectedLog.target_type}: {selectedLog.target_id || 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">IP Address</span>
                <div className="font-semibold text-white mt-0.5 font-mono">
                  {selectedLog.ip_address || '127.0.0.1'}
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">
                Metadata & Change Snapshot (JSON)
              </span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-blue-300 overflow-x-auto max-h-64">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
