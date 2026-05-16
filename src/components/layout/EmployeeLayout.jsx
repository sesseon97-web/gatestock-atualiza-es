import { Outlet } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

export default function EmployeeLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/6a05eb5a8a2aff6653fcfba1/87d5329a1_LogoADIFERFerramen.png"
            alt="ADIFER Ferramentas"
            className="h-9 w-9 object-cover rounded-full"
          />
          <span className="text-sidebar-foreground/80 text-sm font-medium hidden sm:block">Funcionário</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-sidebar-foreground/70 hidden sm:block">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg gap-2"
            onClick={() => base44.auth.logout()}
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
  );
}