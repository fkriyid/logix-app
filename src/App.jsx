import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Carriers from './pages/Carriers';
import DeliveryAnalytics from './pages/DeliveryAnalytics';
import CostAnalysis from './pages/CostAnalysis';
import Exceptions from './pages/Exceptions';
import Reports from './pages/Reports';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  shipments: 'Shipments',
  carriers: 'Carriers',
  analytics: 'Delivery Analytics',
  costs: 'Cost Analysis',
  exceptions: 'Exceptions',
  reports: 'Reports',
};

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const { loading, error, data } = useData();

  if (loading) return <div className="loading-screen"><span>Loading LOGIX data...</span></div>;
  if (error) return <div className="loading-screen"><span style={{ color: 'var(--accent-red)' }}>Error: {error}</span></div>;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'shipments': return <Shipments />;
      case 'carriers': return <Carriers />;
      case 'analytics': return <DeliveryAnalytics />;
      case 'costs': return <CostAnalysis />;
      case 'exceptions': return <Exceptions />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-title">{PAGE_TITLES[activePage]}</div>
          <span className="topbar-badge">{data.length} shipments</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>LOGIX v1.0</span>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
