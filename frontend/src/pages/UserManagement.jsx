import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, UserCheck, UserX, Search } from 'lucide-react';
import { usersApi } from '../api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'risk_analyst',
    full_name: '',
  });

  const { isSuperAdmin, user: currentUser } = useAuth();
  const { success, error: notifyError } = useNotification();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({ per_page: 50 });
      setUsers(res.data.users);
    } catch {
      notifyError('Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersApi.create(newUser);
      success(`User ${newUser.username} registered successfully.`);
      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'risk_analyst',
        full_name: '',
      });
      fetchUsers();
    } catch (err) {
      notifyError(err.response?.data?.message || 'Failed to create user account.');
    }
  };

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id) {
      notifyError('You cannot deactivate your own administrative account.');
      return;
    }
    try {
      await usersApi.update(u.id, { is_active: !u.is_active });
      success(`User ${u.username} ${u.is_active ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (err) {
      notifyError('Failed to update account status.');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <h2 className="text-lg font-bold text-rose-400 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400">
          User account administration is restricted exclusively to Super Admins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Reviewer & User Accounts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage risk investigators, compliance auditors, and system administrators.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all self-start"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading user accounts..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 pl-6">Username</th>
                  <th className="py-3.5 px-4">Full Name & Email</th>
                  <th className="py-3.5 px-4">Role Assigned</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 pl-6 font-mono font-bold text-white">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{u.full_name || 'N/A'}</div>
                      <div className="text-slate-500 text-xs">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          u.role === 'super_admin'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : u.role === 'risk_analyst'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-slate-700/50 text-slate-300 border-slate-600'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <UserCheck className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-medium">
                          <UserX className="w-3.5 h-3.5" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 pr-6 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            u.is_active
                              ? 'bg-rose-950/40 text-rose-300 border-rose-700/50 hover:bg-rose-900/60'
                              : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
                          }`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register System User">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Username *</label>
            <input
              type="text"
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role *</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            >
              <option value="risk_analyst">Risk Analyst / Reviewer (Investigate Alerts & Decisions)</option>
              <option value="super_admin">Super Admin (Full System & Rule Config Access)</option>
              <option value="read_only">Read-Only Viewer (Auditor / Permitted Metrics)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password *</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
