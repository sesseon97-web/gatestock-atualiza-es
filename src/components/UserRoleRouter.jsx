import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import ClientLayout from "@/components/layout/ClientLayout";
import EmployeeLayout from "@/components/layout/EmployeeLayout";

const nameToEmail = (name) =>
  name?.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@adifer.local";

/**
 * Detecta se o usuário logado (não admin) é um Cliente ou Funcionário
 * e renderiza o layout/rota correto.
 */
export default function UserRoleRouter() {
  const { user } = useAuth();
  const location = useLocation();

  const { data: allEmployees = [], isLoading } = useQuery({
    queryKey: ["all-employees-role-check"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const isEmployee = allEmployees.some((e) => nameToEmail(e.name) === user?.email);

  if (isEmployee) {
    // Redireciona para /funcionario se tentar acessar raiz
    if (location.pathname === "/") {
      return <Navigate to="/funcionario" replace />;
    }
    return <EmployeeLayout />;
  }

  return <ClientLayout />;
}