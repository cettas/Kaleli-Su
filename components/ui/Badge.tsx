import React, { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'gradient';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  dot = false,
  pulse = false,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 font-black uppercase tracking-wider transition-all';

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[9px] rounded-lg',
    sm: 'px-2.5 py-1 rounded-lg text-[10px]',
    md: 'px-3 py-1.5 rounded-xl text-xs',
    lg: 'px-4 py-2 rounded-xl text-sm',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
    primary: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border border-amber-200',
    error: 'bg-rose-100 text-rose-700 border border-rose-200',
    info: 'bg-sky-100 text-sky-700 border border-sky-200',
    gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0',
  };

  const dotVariants = {
    default: 'bg-slate-400',
    primary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    gradient: 'bg-white',
  };

  const classes = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `;

  return (
    <span className={classes}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotVariants[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      )}
      {icon && <i className={`fas ${icon} text-[8px]`} />}
      {children}
    </span>
  );
};

export default Badge;
