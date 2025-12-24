import React, { ReactNode } from 'react';

export type StatVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'dark';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  variant?: StatVariant;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  variant = 'primary',
  trend,
  subtitle,
  className = '',
  onClick,
}) => {
  const variantClasses = {
    primary: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
    success: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    error: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
    info: 'bg-gradient-to-br from-sky-500 to-sky-600 text-white',
    dark: 'bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl',
  };

  const baseClasses = `
    relative overflow-hidden p-6 rounded-3xl
    ${variantClasses[variant]}
    shadow-lg hover:shadow-xl transition-all duration-300 group
    ${onClick ? 'cursor-pointer active:scale-95' : ''}
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Decorative background */}
      <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase opacity-80 tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-black tracking-tighter mt-1">
              {value}
            </p>
          </div>
          {icon && (
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <i className={`fas ${icon} text-xl`} />
            </div>
          )}
        </div>

        {trend && (
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`flex items-center gap-1 ${trend.isPositive ? 'text-emerald-200' : 'text-rose-200'}`}>
              <i className={`fas fa-arrow-${trend.isPositive ? 'up' : 'down'}`} />
              {trend.value}
            </span>
            {subtitle && <span className="opacity-70">{subtitle}</span>}
          </div>
        )}

        {!trend && subtitle && (
          <p className="text-xs font-bold opacity-70 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
