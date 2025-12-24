import React from 'react';

// Button Variants
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'glass';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  ripple?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  ripple = true,
  disabled,
  className = '',
  onClick,
  ...props
}) => {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled && !loading) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newRipple = { id: Date.now(), x, y };
      setRipples(prev => [...prev, newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    onClick?.(e);
  };

  const baseClasses = 'relative overflow-hidden font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    xs: 'px-3 py-1.5 text-[10px] rounded-lg',
    sm: 'px-4 py-2 text-[11px] rounded-xl',
    md: 'px-6 py-3 text-xs rounded-2xl',
    lg: 'px-8 py-4 text-sm rounded-2xl',
    xl: 'px-10 py-5 text-base rounded-3xl',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/40 active:scale-95 focus:ring-indigo-500',
    secondary: 'bg-slate-800 text-white hover:bg-slate-700 shadow-lg hover:shadow-xl active:scale-95 focus:ring-slate-500',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus:ring-slate-500 border border-slate-200',
    danger: 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-600/25 hover:shadow-xl hover:shadow-rose-600/40 active:scale-95 focus:ring-rose-500',
    success: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-95 focus:ring-emerald-500',
    glass: 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 shadow-lg active:scale-95 focus:ring-white',
  };

  const classes = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full flex items-center justify-center' : 'inline-flex items-center justify-center'}
    ${className}
  `;

  const iconSize = {
    xs: 'text-[10px]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '0',
            height: '0',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {loading && (
        <i className="fas fa-spinner animate-spin mr-2" />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <i className={`fas ${icon} mr-2 ${iconSize[size]}`} />
      )}

      <span>{children}</span>

      {!loading && icon && iconPosition === 'right' && (
        <i className={`fas ${icon} ml-2 ${iconSize[size]}`} />
      )}
    </button>
  );
};

export default Button;
