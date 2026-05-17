import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Plus, RotateCcw, X, Users, LogOut, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const navItems = [
  { path: "/", label: "Painel", icon: LayoutDashboard },
  { path: "/produtos", label: "Produtos", icon: Package },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { path: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { path: "/novo-pedido", label: "Nova Retirada", icon: Plus },
  { path: "/devolucao", label: "Devolução", icon: RotateCcw },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <img
              src="https://media.base44.com/images/public/6a05eb5a8a2aff6653fcfba1/87d5329a1_LogoADIFERFerramen.png"
              alt="ADIFER Ferramentas"
              className="h-12 w-12 object-cover rounded-full"
            />
          </div>
          <button onClick={onClose} className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <div className="rounded-xl bg-sidebar-accent p-3 text-center">
            <p className="text-xs text-sidebar-foreground/40">ADIFER Ferramentas</p>
            <p className="text-xs text-sidebar-foreground/30 mt-0.5">Admin</p>
          </div>
        </div>
      </aside>
    </>
  );
}