import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import ClientLayout from '@/components/layout/ClientLayout';
import UserRoleRouter from '@/components/UserRoleRouter';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import NewOrder from '@/pages/NewOrder';
import ReturnOrder from '@/pages/ReturnOrder';
import Orders from '@/pages/Orders';
import Clients from '@/pages/admin/Clients';
import ClientDashboard from '@/pages/client/ClientDashboard';
import EmployeeDashboard from '@/pages/employee/EmployeeDashboard';
import Reports from '@/pages/admin/Reports';
import Stock from '@/pages/admin/Stock';
import RepresentativeDashboard from '@/pages/representative/RepresentativeDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const isAdmin = user?.role === "admin";
  const isRepresentante = user?.role === "representante";

  return (
    <Routes>
      {/* Rotas públicas de autenticação — redireciona para / se já logado */}
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Rotas protegidas — redireciona para /login se não autenticado */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {isAdmin ? (
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/pedidos" element={<Orders />} />

            <Route path="/relatorios" element={<Reports />} />
            <Route path="/estoque" element={<Stock />} />
          </Route>
        ) : isRepresentante ? (
          <Route path="/" element={<RepresentativeDashboard />} />
        ) : (
          <Route element={<UserRoleRouter />}>
            <Route path="/" element={<ClientDashboard />} />
            <Route path="/funcionario" element={<EmployeeDashboard />} />
            <Route path="/pedidos" element={<Orders />} />
          </Route>
        )}
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App