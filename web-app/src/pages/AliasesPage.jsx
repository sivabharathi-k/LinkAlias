import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Link2 } from 'lucide-react';
import AliasModal from '../components/AliasModal';
import { api } from '../api/api';

export default function AliasesPage() {
  const [aliases, setAliases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlias, setEditingAlias] = useState(null);

  const fetchAliases = async () => {
    try {
      setLoading(true);
      const data = await api.getAliases();
      setAliases(data || []);
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

  const filteredAliases = aliases.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    return item.url.toLowerCase().includes(q) || item.alias.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Aliases</h1>
          <p className="page-subtitle">Manage all your custom link aliases</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          <Plus size={18} />
          <span>New Alias</span>
        </button>
      </div>

      <div className="card">
        <div style={{ marginBottom: 20, maxWidth: 360, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 38 }}
            placeholder="Search aliases or URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {error && <div className="alert-error">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading aliases...</div>
        ) : filteredAliases.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>{searchQuery ? 'No matching aliases found' : 'No aliases saved yet'}</h3>
            <p style={{ marginTop: 4 }}>
              {searchQuery ? 'Try clearing your search query' : 'Create your first alias using the "New Alias" button'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Original URL</th>
                  <th>Alias Name</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAliases.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <a href={item.url} target="_blank" rel="noreferrer" className="url-badge" title={item.url}>
                        {item.url}
                      </a>
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.alias}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                    </td>
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
