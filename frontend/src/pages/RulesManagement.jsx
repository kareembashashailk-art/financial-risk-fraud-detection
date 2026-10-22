import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  XCircle,
  Edit2,
  Plus,
  Shield,
  Save,
  AlertCircle,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { rulesApi, configApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const RulesManagement = () => {
  const [rules, setRules] = useState([]);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit rule modal
  const [editingRule, setEditingRule] = useState(null);
  const [editForm, setEditForm] = useState({
    weight: 25,
    severity: 'MEDIUM',
    is_enabled: true,
    parameters_text: '{}',
  });
  const [savingRule, setSavingRule] = useState(false);

  // New custom rule modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    id: '',
    name: '',
    description: '',
    weight: 30,
    severity: 'HIGH',
    rule_type: 'custom',
    parameters_text: '{\n  "restricted_categories": ["crypto", "gambling"]\n}',
  });

  // Thresholds config modal
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [threshForm, setThreshForm] = useState({
    low_max: 29,
    medium_max: 59,
    high_min: 60,
    alert_threshold: 60,
  });

  const { isSuperAdmin } = useAuth();
  const { success, error: notifyError } = useNotification();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesRes, threshRes] = await Promise.all([
        rulesApi.getAll(),
        configApi.getThresholds(),
      ]);
      setRules(rulesRes.data.rules);
      setThresholds(threshRes.data);
      if (threshRes.data.thresholds) {
        setThreshForm({
          low_max: threshRes.data.thresholds.low_max,
          medium_max: threshRes.data.thresholds.medium_max,
          high_min: threshRes.data.thresholds.high_min,
          alert_threshold: threshRes.data.alert_threshold || 60,
        });
      }
    } catch {
      notifyError('Failed to fetch rules and configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleRule = async (rule) => {
    if (!isSuperAdmin) return;
    try {
      const newStatus = !rule.is_enabled;
      await rulesApi.update(rule.id, { is_enabled: newStatus });
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_enabled: newStatus } : r))
      );
      success(`Rule "${rule.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update rule status.');
    }
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setEditForm({
      weight: rule.weight,
      severity: rule.severity,
      is_enabled: rule.is_enabled,
      parameters_text: JSON.stringify(rule.parameters, null, 2),
    });
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    let parsedParams = {};
    try {
      parsedParams = JSON.parse(editForm.parameters_text);
    } catch {
      notifyError('Parameters must be formatted as valid JSON.');
      return;
    }

    setSavingRule(true);
    try {
      await rulesApi.update(editingRule.id, {
        weight: parseInt(editForm.weight, 10),
        severity: editForm.severity,
        is_enabled: editForm.is_enabled,
        parameters: parsedParams,
      });
      success(`Rule "${editingRule.name}" configuration saved.`);
      setEditingRule(null);
      fetchData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to save rule.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleCreateCustomRule = async (e) => {
    e.preventDefault();
    let parsedParams = {};
    try {
      parsedParams = JSON.parse(newRuleForm.parameters_text);
    } catch {
      notifyError('Parameters must be formatted as valid JSON.');
      return;
    }

    try {
      await rulesApi.create({
        id: newRuleForm.id || undefined,
        name: newRuleForm.name,
        description: newRuleForm.description,
        weight: parseInt(newRuleForm.weight, 10),
        severity: newRuleForm.severity,
        rule_type: newRuleForm.rule_type,
        parameters: parsedParams,
      });
      success('New custom detection rule added successfully.');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to create custom rule.');
    }
  };

  const handleSaveThresholds = async (e) => {
    e.preventDefault();
    try {
      await configApi.updateThresholds(threshForm);
      success('Risk score boundaries and alert threshold updated.');
      setShowThresholdModal(false);
      fetchData();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to update thresholds.');
    }
  };

  if (loading) return <LoadingSpinner text="Loading detection rules..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Detection Rules Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure transaction risk heuristics, scoring weights, threshold triggers, and parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <>
              <button
                onClick={() => setShowThresholdModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Score Thresholds</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Rule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thresholds Banner */}
      {thresholds && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Active Risk Score Boundaries:</span>
            <span className="text-emerald-400 font-semibold">Low (0–{thresholds.thresholds?.low_max})</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">
              Medium ({thresholds.thresholds?.low_max + 1}–{thresholds.thresholds?.medium_max})
            </span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">High ({thresholds.thresholds?.high_min}–100)</span>
          </div>
          <div className="text-slate-400">
            Auto-Alert Trigger: <span className="font-bold text-white">Score ≥ {thresholds.alert_threshold}</span>
          </div>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`p-6 rounded-2xl border shadow-xl flex flex-col justify-between transition-all ${
              rule.is_enabled
                ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                : 'bg-slate-900/40 border-slate-800/60 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{rule.name}</h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        rule.severity === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : rule.severity === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">{rule.id}</div>
                </div>

                {/* Status Toggle Switch */}
                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      rule.is_enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        rule.is_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                ) : (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      rule.is_enabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
                    }`}
                  >
                    {rule.is_enabled ? 'Active' : 'Disabled'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{rule.description}</p>

              {/* Parameters Breakdown */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Parameters Configuration:
                </div>
                <div className="space-y-1">
                  {Object.entries(rule.parameters || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-slate-400">
                      <span>{key}:</span>
                      <span className="text-blue-300 font-semibold">{JSON.stringify(val)}</span>
                    </div>
                  ))}
                  {Object.keys(rule.parameters || {}).length === 0 && (
                    <span className="text-slate-600 italic">No parameters required</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="text-slate-400">
                Score Weight Contribution:{' '}
                <span className="font-bold text-white text-sm">+{rule.weight} pts</span>
              </div>

              {isSuperAdmin && (
                <button
                  onClick={() => openEditModal(rule)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Configure</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <Modal
          isOpen={!!editingRule}
          onClose={() => setEditingRule(null)}
          title={`Configure Rule: ${editingRule.name}`}
        >
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Score Weight Contribution (0–100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Severity Level</label>
                <select
                  value={editForm.severity}
                  onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rule Parameters (JSON Format)
              </label>
              <textarea
                rows={6}
                value={editForm.parameters_text}
                onChange={(e) => setEditForm({ ...editForm, parameters_text: e.target.value })}
                className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Strict JSON parameter validation is enforced on backend. Arbitrary execution code is disallowed.
              </span>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRule}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {savingRule ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Threshold Boundaries Modal */}
      {showThresholdModal && (
        <Modal
          isOpen={showThresholdModal}
          onClose={() => setShowThresholdModal(false)}
          title="Configure System Risk Thresholds"
        >
          <form onSubmit={handleSaveThresholds} className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Adjust the composite scoring boundaries that partition scores (0–100) into Low, Medium, and High tiers.
              Thresholds must be strictly non-overlapping and contiguous.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Low Risk Max</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={threshForm.low_max}
                  onChange={(e) =>
                    setThreshForm({ ...threshForm, low_max: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Medium Risk Max</label>
                <input
                  type="number"
                  min="10"
                  max="90"
                  required
                  value={threshForm.medium_max}
                  onChange={(e) => {
                    const med = parseInt(e.target.value, 10);
                    setThreshForm({
                      ...threshForm,
                      medium_max: med,
                      high_min: med + 1,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">High Risk Min</label>
                <input
                  type="number"
                  disabled
                  value={threshForm.high_min}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Automatic Alert Score Threshold
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={threshForm.alert_threshold}
                onChange={(e) =>
                  setThreshForm({ ...threshForm, alert_threshold: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
              <span className="text-[11px] text-slate-500 block mt-1">
                Transactions scoring at or above this value will automatically trigger an investigative alert.
              </span>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowThresholdModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Save Boundaries
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Custom Rule Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create Custom Fraud Detection Rule"
        >
          <form onSubmit={handleCreateCustomRule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rule ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. RULE_CUSTOM_OFFSHORE_WIRE"
                value={newRuleForm.id}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, id: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. High-Risk Industry Filter"
                value={newRuleForm.name}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
              <textarea
                rows={2}
                required
                placeholder="Explains what suspicious behavior this rule monitors..."
                value={newRuleForm.description}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Weight Contribution (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={newRuleForm.weight}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, weight: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Severity</label>
                <select
                  value={newRuleForm.severity}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, severity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Parameters (JSON)</label>
              <textarea
                rows={4}
                value={newRuleForm.parameters_text}
                onChange={(e) => setNewRuleForm({ ...newRuleForm, parameters_text: e.target.value })}
                className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Create Detection Rule
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
