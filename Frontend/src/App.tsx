import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DBConfigPanel } from './components/DBConfigPanel';
import { SchemaExplorer } from './components/SchemaExplorer';
import { GeneralChatPanel } from './components/GeneralChatPanel';
import { ChatInterface } from './components/NL2SQLWorkspace/ChatInterface';
import { OutputPanel } from './components/NL2SQLWorkspace/OutputPanel';

import { useDbConnection } from './hooks/useDbConnection';
import { useNl2Sql } from './hooks/useNl2Sql';
import { useGeneralChat } from './hooks/useGeneralChat';
import { AnalyticsPanel } from './components/AnalyticsPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'nlsql' | 'chat' | 'settings' | 'analytics'>('settings');

  // Load state logic from custom hooks
  const {
    connectionString,
    isConnected,
    checking,
    connMessage,
    schema,
    schemaLoading,
    connect,
    refreshSchema
  } = useDbConnection();

  const {
    nlChatHistory,
    nlLoading,
    selectedChatIndex,
    setSelectedChatIndex,
    outputTab,
    setOutputTab,
    submitQuery
  } = useNl2Sql(isConnected);

  const {
    generalMessages,
    generalLoading,
    submitGeneralPrompt
  } = useGeneralChat();

  const activeMessage = selectedChatIndex !== null ? nlChatHistory[selectedChatIndex] : undefined;

  return (
    <div className="flex w-full min-h-screen text-slate-100 bg-[#060913] select-none">

      {/* Side navigation bar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onRefresh={refreshSchema}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Workspace 1: NL2SQL Workspace split view */}
        {activeTab === 'nlsql' && (
          <div className="flex-1 flex overflow-hidden animate-slideup h-full">
            {/* Table schema sidebar */}
            <SchemaExplorer
              schema={schema}
              loading={schemaLoading}
              onNavigateToSettings={() => setActiveTab('settings')}
            />

            {/* Chat dialog panel */}
            <ChatInterface
              chatHistory={nlChatHistory}
              loading={nlLoading}
              selectedChatIndex={selectedChatIndex}
              onSelectChat={setSelectedChatIndex}
              onSubmit={submitQuery}
              isConnected={isConnected}
            />

            {/* Visual queries and data tables detail pane */}
            <OutputPanel
              activeMessage={activeMessage}
              outputTab={outputTab}
              setOutputTab={setOutputTab}
            />
          </div>
        )}

        {/* Workspace 2: General Chat completions chatbot */}
        {activeTab === 'chat' && (
          <GeneralChatPanel
            messages={generalMessages}
            loading={generalLoading}
            onSubmit={submitGeneralPrompt}
          />
        )}

        {/* Workspace 3: Database URL Connection config panel */}
        {activeTab === 'settings' && (
          <DBConfigPanel
            connectionString={connectionString}
            checking={checking}
            connMessage={connMessage}
            onConnect={connect}
          />
        )}

        {/* Workspace 4: Analytics Screen to search from pdfs */}
        {activeTab === 'analytics' && (
          <AnalyticsPanel />
        )}

      </main>

    </div>
  );
}
