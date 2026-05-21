import { createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

export const ClientSessionContext = createContext(null);
export const useClientSession = () => useContext(ClientSessionContext);

export default function ClientLayout() {
  const { user } = useAuth();

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

  // Identifica o cliente pelo email do usuário logado
  const clientSession = allClients.find(
    (c) => c.email?.toLowerCase() === user?.email?.toLowerCase()
  );

  if (!clientSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Nenhum cliente encontrado para o email <span className="font-mono text-primary">{user?.email}</span>.
          </p>
          <p className="text-xs text-muted-foreground">Entre em contato com o administrador.</p>
          <Button variant="outline" size="sm" onClick={() => base44.auth.logout()}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <ClientSessionContext.Provider value={clientSession}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a05eb5a8a2aff6653fcfba1/87d5329a1_LogoADIFERFerramen.png"
              alt="ADIFER Ferramentas"
              className="h-9 w-9 object-cover rounded-full"
            />
            <span className="text-sm font-semibold text-sidebar-foreground">{clientSession.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg gap-2"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Sair</span>
          </Button>
        </header>

        <main className="p-4 md:p-8 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>
    </ClientSessionContext.Provider>
  );
}