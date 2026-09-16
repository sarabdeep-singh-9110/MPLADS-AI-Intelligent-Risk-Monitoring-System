import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import RiskMonitoringPage from './pages/RiskMonitoringPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import GisPage from './pages/GisPage';
import SimilarWorksPage from './pages/SimilarWorksPage';
import VendorIntelligencePage from './pages/VendorIntelligencePage';
import AiCopilotPage from './pages/AiCopilotPage';
import InvestigationsPage from './pages/InvestigationsPage';
import FinancialPage from './pages/FinancialPage';
import ReportsPage from './pages/ReportsPage';
import AiRiskCopilotDrawer from './components/AiRiskCopilotDrawer';
import RolePersonaBanner from './components/RolePersonaBanner';
import { RoleProvider } from './context/RoleContext';

function AppContent() {
  const [activePage, setActivePage] = useState('overview');
  const [previousPage, setPreviousPage] = useState('projects');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Project for Detail View & AI Drawer
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [drawerAiProjectId, setDrawerAiProjectId] = useState(null);

  // Handle opening Project Detail
  const handleOpenDetail = (id, fromPage) => {
    setSelectedProjectId(id);
    setPreviousPage(fromPage || (activePage === 'detail' ? 'projects' : activePage));
    setActivePage('detail');
  };

  // Handle opening AI Copilot
  const handleOpenAiCopilot = (id) => {
    setSelectedProjectId(id);
    setActivePage('ai');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Header */}
      <Header />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Navigation */}
        <Sidebar
          activePage={activePage === 'detail' ? 'projects' : activePage}
          setActivePage={(page) => {
            setActivePage(page);
            if (page !== 'detail') setSelectedProjectId(null);
          }}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Active Role Persona Banner */}
          <RolePersonaBanner onNavigateToPage={setActivePage} />

          {activePage === 'overview' && (
            <OverviewPage
              onSelectState={(st) => setActivePage('gis')}
              onOpenProjectDetail={handleOpenDetail}
            />
          )}

          {activePage === 'risk' && (
            <RiskMonitoringPage
              onOpenDetail={handleOpenDetail}
              onOpenAiCopilot={handleOpenAiCopilot}
            />
          )}

          {activePage === 'projects' && (
            <ProjectsPage
              onOpenDetail={handleOpenDetail}
              onOpenAiCopilot={handleOpenAiCopilot}
              searchQuery={searchQuery}
            />
          )}

          {activePage === 'similar' && (
            <SimilarWorksPage
              onOpenProjectDetail={handleOpenDetail}
            />
          )}

          {activePage === 'gis' && (
            <GisPage
              onOpenProjectDetail={handleOpenDetail}
            />
          )}

          {activePage === 'investigations' && (
            <InvestigationsPage
              onOpenDetail={handleOpenDetail}
            />
          )}

          {activePage === 'financial' && (
            <FinancialPage
              onOpenProjectDetail={handleOpenDetail}
            />
          )}

          {activePage === 'vendors' && (
            <VendorIntelligencePage
              onOpenProjectDetail={handleOpenDetail}
            />
          )}

          {activePage === 'detail' && selectedProjectId && (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setActivePage(previousPage === 'detail' ? 'projects' : (previousPage || 'projects'))}
              onOpenAiCopilot={handleOpenAiCopilot}
            />
          )}

          {activePage === 'ai' && (
            <AiCopilotPage
              initialProjectId={selectedProjectId}
            />
          )}

          {activePage === 'reports' && (
            <ReportsPage />
          )}

        </main>
      </div>

      {/* Global Clean Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500 z-10">
        <p>Smart India Hackathon SIH26102 • MPLADS AI Intelligent Risk & Monitoring Engine • Ministry of Statistics & Programme Implementation (MoSPI)</p>
      </footer>

      {/* Optional AI Copilot Drawer */}
      {drawerAiProjectId && (
        <AiRiskCopilotDrawer
          projectId={drawerAiProjectId}
          onClose={() => setDrawerAiProjectId(null)}
        />
      )}

    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <AppContent />
    </RoleProvider>
  );
}
