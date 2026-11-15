import React, { useState } from 'react';
import { LayoutDashboard, Package, Truck, BarChart2, DollarSign, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'shipments', label: 'Shipments', icon: Package },
  { id: 'carriers', label: 'Carriers', icon: Truck },
  { id: 'analytics', label: 'Delivery Analytics', icon: BarChart2 },
  { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">LX</div>
        {!collapsed && (
          <div>
            <div className="logo-text">LOGIX</div>
            <div className="logo-sub">Operations Platform</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
            title={collapsed ? label : undefined}
          >
            <span className="nav-icon"><Icon size={16} /></span>
            {!collapsed && <span className="nav-label">{label}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-toggle" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span style={{ marginLeft: 8, fontSize: 12 }}>Collapse</span></>}
      </div>
    </div>
  );
}
