import React from 'react';
import { User, Mail, Calendar, LogOut } from 'lucide-react';
import { api } from '../api/api';

export default function ProfilePage({ user }) {
  const handleLogout = () => {
    api.logout();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Your LinkAlias account details</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || 'User'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{user?.email}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} /> Full Name
          </label>
          <input type="text" className="form-input" value={user?.name || ''} readOnly />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} /> Email Address
          </label>
          <input type="email" className="form-input" value={user?.email || ''} readOnly />
        </div>

        {user?.created_at && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Member Since
            </label>
            <input
              type="text"
              className="form-input"
              value={new Date(user.created_at).toLocaleDateString()}
              readOnly
            />
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-danger btn-full" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
