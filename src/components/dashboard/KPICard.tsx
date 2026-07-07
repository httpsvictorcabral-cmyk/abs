import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; positive: boolean };
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'accent';
  children?: ReactNode;
}

const colorClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

export function KPICard({ title, value, icon: Icon, description, trend, color = 'primary', children }: KPICardProps) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-all hover:shadow-lg hover:shadow-primary/5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span className={trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">vs. período anterior</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </Card>
  );
}
