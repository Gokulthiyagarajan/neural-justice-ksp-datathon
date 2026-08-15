import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import TopCommandBar from './TopCommandBar';
import AiPanel from '@/components/AI/AiPanel';
import AiFloatingButton from '@/components/AI/AiFloatingButton';
import StatusBar from './StatusBar';
import { SeoHead } from '@/components/Common/SeoHead';
import { RightDrawer } from '@/components/Common/RightDrawer';
import { SyntheticDataNotice } from '@/components/Common/SyntheticDataNotice';
import { AiAssistantProvider } from '@/context/AiAssistantContext';
import { useAuth } from '@/hooks/useAuth';
import { canAccess } from '@/config/navConfig';

/**
 * AI is accessed via a floating "Ask AI" button (bottom-right) that opens
 * a centered modal overlay. No AI panel or sidebar is permanently visible.
 * The dashboard occupies full width at all times.
 * Conversation state is preserved when the AI closes.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const location = useLocation();
  const { getPrimaryRole } = useAuth();
  const userRole = getPrimaryRole();
  const copilotVisible = canAccess(userRole, 'OFFICER');

  const handleAIClick = useCallback(() => {
    setAiOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden text-text-primary bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-service-blue focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
      >
        {t('a11y.skipToContent')}
      </a>
      <SeoHead />
      <Sidebar
        isExpanded={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <AiAssistantProvider>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopCommandBar onMenuClick={() => setSidebarOpen(true)} />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto mt-12 sm:mt-14"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <SyntheticDataNotice />
            <div key={location.key} className="p-2 sm:p-3 md:p-4 lg:p-6 min-h-[calc(100vh-5rem)] md:min-h-[calc(100vh-6.5rem)]">
              <Outlet />
            </div>
          </main>
          <StatusBar />
        </div>

        {/* Floating "Ask AI" button — only visible to authenticated roles with access */}
        {copilotVisible && (
          <AiFloatingButton onClick={handleAIClick} isOpen={aiOpen} />
        )}

        {/* AI modal overlay */}
        {copilotVisible && <AiPanel visible={aiOpen} />}
      </AiAssistantProvider>
      <RightDrawer />
    </div>
  );
}
