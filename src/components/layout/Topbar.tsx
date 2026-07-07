import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Bell, Menu, LogOut, ChevronDown } from 'lucide-react';
import { useThemeStore } from '@/lib/theme';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (search.trim().length >= 2) {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase
          .from('funcionarios')
          .select('id, nome, matricula, cargo:cargos(nome)')
          .or(`nome.ilike.%${search}%,matricula.ilike.%${search}%`)
          .limit(8);
        setSearchResults(data || []);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const initials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const roleBadgeColor = {
    Administrador: 'bg-red-500/10 text-red-600 dark:text-red-400',
    RH: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Gestor: 'bg-green-500/10 text-green-600 dark:text-green-400',
    Visualizador: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar funcionário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          className="pl-9"
        />
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full rounded-lg border border-border bg-popover shadow-lg z-50 animate-scale-in">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  navigate(`/funcionarios/${r.id}`);
                  setShowResults(false);
                  setSearch('');
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {r.nome?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    Mat. {r.matricula} {r.cargo?.nome ? `• ${r.cargo.nome}` : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-tight">{user?.nome}</span>
                <Badge
                  variant="secondary"
                  className={cn('text-xs px-1.5 py-0 h-4', roleBadgeColor[user?.role || 'Visualizador'])}
                >
                  {user?.role}
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.nome}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
