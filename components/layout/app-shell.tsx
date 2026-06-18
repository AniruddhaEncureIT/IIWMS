"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { FloatingChat } from "./floating-chat";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();
  const { notifications } = useNotifications(user?.role ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Apply saved primary color on every app load
  useEffect(() => {
    try {
      const raw = localStorage.getItem("iims_general_config");
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.primaryColor) document.documentElement.style.setProperty("--primary", cfg.primaryColor);
      }
    } catch { /* ignore */ }
  }, []);
  const [chatOpen,      setChatOpen]      = useState(false);
  const [isProcessing,  setIsProcessing]  = useState(false);

  const role = user?.role ?? "";
  const name = user?.name ?? "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Fixed sidebar — desktop ──────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:z-40">
        <AppSidebar role={role} name={name} />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative flex flex-col w-64 z-50 shadow-2xl">
            <AppSidebar
              role={role}
              name={name}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Fixed header ────────────────────────────────────────────── */}
      <AppHeader
        onMenuOpen={() => setSidebarOpen(true)}
        onChatOpen={() => setChatOpen((o) => !o)}
        chatOpen={chatOpen}
        isProcessing={isProcessing}
      />

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="lg:ml-64 pt-14">
        <main id="main-content" className="min-h-[calc(100vh-3.5rem)] p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* ── Floating IIMS Assistant ──────────────────────────────────── */}
      <FloatingChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        user={user}
        notifications={notifications}
        onTypingChange={setIsProcessing}
      />
    </div>
  );
}
