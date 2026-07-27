/**
 * components/NotificationBell.jsx
 *
 * Navbar notification bell with:
 *  - Unread badge that polls every 30 s while authenticated
 *  - Dropdown with the 5 most recent notifications
 *  - No duplicate setInterval timers (interval cleared in useEffect cleanup)
 *  - Stops polling on logout / unmount
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, getNotifications } from '../services/notificationService';

const POLL_MS = 30_000;

const TYPE_ICONS = {
  booking:  '🏨',
  payment:  '💳',
  refund:   '💰',
  reminder: '⏰',
  system:   'ℹ️',
};

const NotificationBell = () => {
  const { user } = useAuth();
  const [count,      setCount]      = useState(0);
  const [open,       setOpen]       = useState(false);
  const [recents,    setRecents]    = useState([]);
  const [loadingDrp, setLoadingDrp] = useState(false);
  const intervalRef  = useRef(null);
  const dropdownRef  = useRef(null);

  // ── polling ────────────────────────────────────────────────────────────────

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUnreadCount();
      setCount(data?.count ?? 0);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCount(0);
      setOpen(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    fetchCount();
    // Clear any existing interval before creating a new one (React Strict Mode
    // runs effects twice in development; this prevents duplicate timers)
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchCount, POLL_MS);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [user, fetchCount]);

  // ── dropdown ───────────────────────────────────────────────────────────────

  const handleBellClick = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      setLoadingDrp(true);
      try {
        const data = await getNotifications(1, 5);
        setRecents(data?.notifications ?? []);
      } catch {
        setRecents([]);
      } finally {
        setLoadingDrp(false);
      }
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!user) return null;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <li className="nav-item position-relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        type="button"
        className="btn btn-link nav-link px-2 position-relative"
        onClick={handleBellClick}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
        aria-expanded={open}
      >
        <i className="bi bi-bell" style={{ fontSize: '1.25rem' }} />
        {count > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.65rem', lineHeight: '1.3' }}
            aria-live="polite"
            aria-atomic="true"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="dropdown-menu show p-0 shadow"
          style={{
            right: 0, left: 'auto', minWidth: '320px', maxWidth: '360px',
            borderRadius: '12px', overflow: 'hidden', zIndex: 1050,
          }}
        >
          {/* Header */}
          <div
            className="d-flex align-items-center justify-content-between px-3 py-2"
            style={{ background: 'linear-gradient(135deg,#1a3c5e,#2d6fa5)', color: '#fff' }}
          >
            <span className="fw-semibold" style={{ fontSize: '0.95rem' }}>Notifications</span>
            <Link
              to="/notifications"
              className="text-white small"
              onClick={() => setOpen(false)}
              style={{ opacity: 0.85 }}
            >
              View all
            </Link>
          </div>

          {/* Body */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {loadingDrp ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-secondary" role="status">
                  <span className="visually-hidden">Loading…</span>
                </div>
              </div>
            ) : recents.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-bell-slash d-block mb-1" style={{ fontSize: '1.6rem' }} />
                <small>No notifications yet</small>
              </div>
            ) : recents.map((n) => (
              <div
                key={n.id}
                className="px-3 py-2 border-bottom"
                style={{ background: n.read_at ? '#fff' : 'rgba(45,111,165,0.06)' }}
              >
                <div className="d-flex align-items-start gap-2">
                  <span style={{ fontSize: '1.1rem', lineHeight: 1.5 }}>
                    {TYPE_ICONS[n.type] ?? 'ℹ️'}
                  </span>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex align-items-center gap-1 mb-0">
                      <span className="fw-semibold" style={{ fontSize: '0.82rem' }}>{n.title}</span>
                      {!n.read_at && (
                        <span className="badge bg-warning text-dark" style={{ fontSize: '0.58rem' }}>New</span>
                      )}
                    </div>
                    <div
                      className="text-muted text-truncate"
                      style={{ fontSize: '0.78rem', maxWidth: '260px' }}
                    >
                      {n.message}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-top">
            <Link
              to="/notifications"
              id="notification-view-all-link"
              className="btn btn-sm btn-outline-secondary w-100 rounded-pill"
              style={{ fontSize: '0.82rem' }}
              onClick={() => setOpen(false)}
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </li>
  );
};

export default NotificationBell;
