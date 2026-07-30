/**
 * pages/admin/AdminUsers.jsx
 * Admin Customers Management dashboard.
 * Phase 7C: deactivation/reactivation actions, pagination, search, status indicators.
 */

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllUsers, deactivateUser, reactivateUser } from '../../services/adminService';
import Pagination from '../../components/Pagination';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_pages: 1 });
  const [deactivatingId, setDeactivatingId] = useState(null);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        role: roleFilter,
        search,
        paginate: 'true'
      });
      const response = await getAllUsers(params.toString());
      const data = response.data?.data;
      if (data) {
        setUsers(data.items || []);
        setPagination({
          page: data.page,
          limit: data.limit,
          total_pages: data.total_pages,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleDeactivate = async (userId) => {
    const reason = window.prompt('Enter reason for deactivating this user (optional):');
    if (reason === null) return; // user cancelled prompt

    try {
      await deactivateUser(userId, reason || 'Admin action');
      alert('User deactivated.');
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Deactivation failed.');
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to reactivate this user?')) return;
    try {
      await reactivateUser(userId);
      alert('User reactivated.');
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Reactivation failed.');
    }
  };

  return (
    <AdminLayout title="Manage Customers">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card glass-card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2">
          <div className="col-sm-5">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-sm-3">
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="customer">Customers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div className="col-sm-4 d-flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm flex-grow-1 rounded-pill">Search</button>
            <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => { setSearch(''); setRoleFilter(''); fetchUsers(1); }}>Reset</button>
          </div>
        </form>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-semibold">{u.first_name} {u.last_name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className={`badge bg-${u.role === 'admin' ? 'dark' : 'primary'}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge bg-${u.is_active ? 'success' : 'danger'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="text-end">
                      {u.is_active ? (
                        <button
                          className="btn btn-sm btn-outline-danger px-3 py-1 rounded-pill"
                          onClick={() => handleDeactivate(u.id)}
                          style={{ fontSize: '0.74rem' }}
                          title="Deactivate account"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-success px-3 py-1 rounded-pill"
                          onClick={() => handleReactivate(u.id)}
                          style={{ fontSize: '0.74rem' }}
                          title="Reactivate account"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={(p) => fetchUsers(p)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
