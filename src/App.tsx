import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useThemeStore } from '@/lib/theme';
import { LoginPage } from '@/pages/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { FuncionariosPage } from '@/pages/FuncionariosPage';
import { FuncionarioDetailPage } from '@/pages/FuncionarioDetailPage';
import { ImportFuncionariosPage } from '@/pages/ImportFuncionariosPage';
import { ImportOcorrenciasPage } from '@/pages/ImportOcorrenciasPage';
import { OcorrenciasPage } from '@/pages/OcorrenciasPage';
import { AlertasPage } from '@/pages/AlertasPage';
import { RelatoriosPage } from '@/pages/RelatoriosPage';
import { AuditoriaPage } from '@/pages/AuditoriaPage';
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

function AppRoutes() {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/funcionarios" element={<FuncionariosPage />} />
        <Route path="/funcionarios/:id" element={<FuncionarioDetailPage />} />
        <Route path="/ocorrencias" element={<OcorrenciasPage />} />
        <Route path="/import/funcionarios" element={<ImportFuncionariosPage />} />
        <Route path="/import/ocorrencias" element={<ImportOcorrenciasPage />} />
        <Route path="/alertas" element={<AlertasPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/auditoria" element={<AuditoriaPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const initAuth = useAuthStore((s) => s.init);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
