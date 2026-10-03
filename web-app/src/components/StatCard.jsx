import React from 'react';

export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      {Icon && (
        <div className="stat-icon">
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}
