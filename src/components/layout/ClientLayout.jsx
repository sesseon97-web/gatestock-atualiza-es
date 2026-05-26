import { useState, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import ClientSecondLogin from "@/pages/client/ClientSecondLogin";

const SESSION_KEY = "ksc_client_session";

// Contexto para compartilhar o cliente autenticado no segundo login
export const ClientSessionContext = createContext(null);
export const useClientSession = () => useContext(ClientSessionContext);

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(client) {
  try {
    if (client) sessionStorage.setItem(SESSION_KEY, JSON.stringify(client));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export default function ClientLayout() {
  const { user } = useAuth();
  const [clientSession, setClientSession] = useState(() => loadSession());

  const handleLogin = (client) => {
    saveSession(client);
    setClientSession(client);
  };

  const handleLogout = () => {
    saveSession(null);
    setClientSession(null);
  };

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ["all-clients-for-login"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Se não fez o segundo login ainda, mostra a tela de login do cliente
  if (!clientSession) {
    return (
      <ClientSecondLogin
        clients={allClients.filter((c) => c.app_username && c.app_password)}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <ClientSessionContext.Provider value={clientSession}>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a14a4e0cde3835f676a164e/4e5ad93a6_ksc.PNG"
              alt="KSC"
              className="h-7 object-contain"
            />
            <span className="text-sm font-semibold text-sidebar-foreground">{clientSession.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sair</span>
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </ClientSessionContext.Provider>
  );
}