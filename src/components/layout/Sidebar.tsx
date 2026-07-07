import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileSpreadsheet, AlertTriangle,
  FileBarChart, History, Settings, ChevronLeft, Activity,
  UserCog, ClipboardList, Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['Administrador', 'RH', 'Gestor', 'Visualizador'] },
  { to: '/funcionarios', icon: Users, label: 'Funcionários', roles: ['Administrador', 'RH', 'Gestor'] },
  { to: '/ocorrencias', icon: ClipboardList, label: 'Ocorrências', roles: ['Administrador', 'RH', 'Gestor'] },
  { to: '/import/funcionarios', icon: FileSpreadsheet, label: 'Import. Funcionários', roles: ['Administrador', 'RH'] },
  { to: '/import/ocorrencias', icon: Activity, label: 'Import. Ocorrências', roles: ['Administrador', 'RH'] },
  { to: '/alertas', icon: AlertTriangle, label: 'Alertas', roles: ['Administrador', 'RH', 'Gestor'] },
  { to: '/relatorios', icon: FileBarChart, label: 'Relatórios', roles: ['Administrador', 'RH', 'Gestor', 'Visualizador'] },
  { to: '/usuarios', icon: UserCog, label: 'Usuários', roles: ['Administrador'] },
  { to: '/auditoria', icon: History, label: 'Auditoria', roles: ['Administrador', 'RH'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', roles: ['Administrador'] },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  const visibleItems = navItems.filter(item =>
    user && item.roles.includes(user.role)
  );

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">ABS RH</span>
            <span className="text-xs text-muted-foreground">Gestão de Absenteísmo</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative group',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-accent',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-12 items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-sidebar-foreground hover:bg-accent transition-colors"
      >
        <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  );
}
