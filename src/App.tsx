import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { ToastProvider } from "./components/Toast";
import { UpdateChecker } from "./components/UpdateChecker";
import { useSchedulerEvents } from "./hooks/useSchedulerEvents";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { Chat } from "./pages/Chat";
import { Inbox } from "./pages/Inbox";
import { Settings } from "./pages/Settings";

function AppContent() {
  // Listen for scheduler events and show toast notifications
  useSchedulerEvents();

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
