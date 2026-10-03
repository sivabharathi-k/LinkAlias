import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AliasModal({ isOpen, onClose, onSave, initialData }) {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setUrl(initialData.url || '');
      setAlias(initialData.alias || '');
    } else {
      setUrl('');
      setAlias('');
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || !alias.trim()) {
      setError('Please provide both URL and Alias name.');
      return;
    }
    if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSave({ url: url.trim(), alias: alias.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save alias.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">{initialData ? 'Edit Link Alias' : 'Create New Link Alias'}</h3>
          <button className="btn-logout" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Target URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://google.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={Boolean(initialData)} // URL is immutable key when editing
            />
          </div>

          <div className="form-group">
            <label className="form-label">Custom Alias Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. My Custom Google Alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Alias'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
