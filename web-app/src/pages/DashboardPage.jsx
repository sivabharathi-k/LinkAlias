import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Globe, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import StatCard from '../components/StatCard';
import AliasModal from '../components/AliasModal';
import { api } from '../api/api';

export default function DashboardPage({ user }) {
  const [aliases, setAliases] = useState([]);
  const [enabledCount, setEnabledCount] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState(null);

  const fetchAliases = async () => {
    try {
      setLoading(true);
      const data = await api.getAliases();
      setAliases(data || []);

      try {
        const prefData = await api.getPlatformPreferences();
        if (prefData && Array.isArray(prefData.enabled_platforms)) {
          setEnabledCount(prefData.enabled_platforms.length);
        }
      } catch (pErr) {
        console.warn('Could not load preferences in dashboard:', pErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load aliases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAliases();
  }, []);

  const handleCreateNew = () => {
    setEditingAlias(null);
    setModalOpen(true);
  };

  const handleEdit = (aliasItem) => {
    setEditingAlias(aliasItem);
    setModalOpen(true);
  };

  const handleDelete = async (url) => {
    if (!window.confirm(`Are you sure you want to delete alias for ${url}?`)) return;
    try {
      await api.deleteAlias(url);
      fetchAliases();
    } catch (err) {
      alert(err.message || 'Failed to delete alias');
    }
  };

  const handleSaveModal = async (data) => {
    if (editingAlias) {
      await api.updateAlias(data.url, data.alias);
    } else {
      await api.createAlias(data.url, data.alias);
    }
    fetchAliases();
  };

  const recentAliases = aliases.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.name || 'User'} 👋</h1>
          <p className="page-subtitle">Overview of your LinkAlias control panel</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          <Plus size={18} />
          <span>New Alias</span>
        </button>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Aliases" value={aliases.length} icon={Link2} />
        <StatCard label="Enabled Platforms" value={`${enabledCount} / 5 Platforms`} icon={Globe} />
      </div>


      <div className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <h2 className="card-title" style={{ margin: 0 }}>Recent Aliases</h2>
          <Link to="/aliases" className="auth-link" style={{ fontSize: 14 }}>
            View All Aliases &rarr;
          </Link>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading aliases...</div>
        ) : recentAliases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔗</div>
            <h3>No aliases created yet</h3>
            <p style={{ marginTop: 4 }}>Click "New Alias" above to create your first link alias!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Original URL</th>
                  <th>Alias Name</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAliases.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="url-badge" title={item.url}>
                        {item.url}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.alias}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-btns" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" onClick={() => handleEdit(item)} title="Edit Alias">
                          <Edit2 size={15} />
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDelete(item.url)} title="Delete Alias">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AliasModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
        initialData={editingAlias}
      />
    </div>
  );
}
