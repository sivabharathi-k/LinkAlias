import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Link2, Globe, User, LogOut } from 'lucide-react';
import { api } from '../api/api';

export default function Sidebar({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">🔗</span>
        <span className="sidebar-title">LinkAlias</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/aliases" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Link2 size={18} />
          <span>My Aliases</span>
        </NavLink>

        <NavLink to="/websites" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Globe size={18} />
          <span>Websites</span>
        </NavLink>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <User size={18} />
          <span>Profile</span>
        </NavLink>
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="user-info">
            <span className="user-name">{user.name || 'User'}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
