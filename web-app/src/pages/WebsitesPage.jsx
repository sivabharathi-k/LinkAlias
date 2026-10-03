import React, { useState, useEffect } from 'react';
import { Globe, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../api/api';

const SUPPORTED_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', domain: 'web.whatsapp.com' },
  { id: 'telegram', name: 'Telegram', domain: 'web.telegram.org' },
  { id: 'discord', name: 'Discord', domain: 'discord.com' },
  { id: 'facebook', name: 'Facebook', domain: 'facebook.com' },
  { id: 'instagram', name: 'Instagram', domain: 'instagram.com' }
];

export default function WebsitesPage() {
  const [enabledPlatforms, setEnabledPlatforms] = useState(['whatsapp', 'telegram', 'discord']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const data = await api.getPlatformPreferences();
        if (data && Array.isArray(data.enabled_platforms)) {
          setEnabledPlatforms(data.enabled_platforms);
        }
      } catch (err) {
        console.warn('Failed to load platform preferences:', err);
        setErrorMessage(err.message || 'Failed to load preferences.');
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  const handleToggle = (platformId) => {
    setEnabledPlatforms((prev) => {
      if (prev.includes(platformId)) {
        return prev.filter((id) => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSavedMessage('');
      setErrorMessage('');

      await api.updatePlatformPreferences(enabledPlatforms);
      setSavedMessage('Preferences saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Website & Platform Preferences</h1>
          <p className="page-subtitle">Choose which platforms LinkAlias should active link detection on</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          <Save size={18} />
          <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </div>

      {savedMessage && (
        <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && <div className="alert-error">{errorMessage}</div>}

      <div className="card">
        <h2 className="card-title">Supported Platforms</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
          Enable or disable LinkAlias detection engine for each supported platform.
        </p>

        {loading ? (
          <div className="empty-state">Loading preferences...</div>
        ) : (
          <div className="preference-list">
            {SUPPORTED_PLATFORMS.map((platform) => {
              const isChecked = enabledPlatforms.includes(platform.id);
              return (
                <div key={platform.id} className="preference-item" onClick={() => handleToggle(platform.id)} style={{ cursor: 'pointer' }}>
                  <div className="preference-info">
                    <Globe size={20} color={isChecked ? "var(--primary)" : "var(--text-muted)"} />
                    <div>
                      <div className="preference-name" style={{ fontWeight: isChecked ? 600 : 400 }}>
                        {platform.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{platform.domain}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`preference-tag ${isChecked ? 'tag-active' : ''}`} style={{
                      backgroundColor: isChecked ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-muted)',
                      color: isChecked ? 'var(--primary)' : 'var(--text-muted)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {isChecked ? 'Enabled' : 'Disabled'}
                    </span>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(platform.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
