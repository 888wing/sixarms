import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/Toast";
import { UpdateChecker } from "./components/UpdateChecker";
import { useAppEvents } from "./hooks/useAppEvents";
import { useStoreSync } from "./hooks/useStoreSync";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { Inbox } from "./pages/Inbox";
import { Todos } from "./pages/Todos";
import { Versions } from "./pages/Versions";
import { Settings } from "./pages/Settings";

function AppContent() {
  // Listen for app events (scheduler + data sync) and show toast notifications
  useAppEvents();
  // Sync stores when project selection changes
  useStoreSync();

  return (
    <BrowserRouter>
      <div className="app-background min-h-screen flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/versions" element={<Versions />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <UpdateChecker />
    </ToastProvider>
  );
}

export default App;
