import React, { forwardRef } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string;
  size?: SelectSize;
  variant?: 'default' | 'filled' | 'outlined';
  fullWidth?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  icon,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  options,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseClasses = 'w-full font-black uppercase appearance-none cursor-pointer transition-all duration-200 focus:outline-none';

  const sizeClasses = {
    sm: 'px-4 py-2.5 text-[10px] rounded-xl',
    md: 'px-6 py-4 text-xs rounded-2xl',
    lg: 'px-6 py-5 text-sm rounded-2xl',
  };

  const variantClasses = {
    default: 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
    filled: 'bg-slate-100 border-0 focus:bg-white focus:ring-2 focus:ring-indigo-500/20',
    outlined: 'bg-transparent border-2 border-slate-200 focus:border-indigo-500',
  };

  const stateClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
    : '';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed bg-slate-100'
    : '';

  const classes = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${stateClasses}
    ${disabledClasses}
    ${icon ? 'pl-12 pr-10' : 'pr-10'}
    ${className}
  `;

  const iconSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <i className={`fas ${icon} ${iconSize[size]}`}></i>
          </div>
        )}

        <select
          ref={ref}
          className={classes}
          disabled={disabled}
          {...props}
        >
          {options.map(option => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-white text-slate-900"
            >
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <i className={`fas fa-chevron-down ${iconSize[size]}`}></i>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[10px] font-bold text-rose-500 flex items-center gap-1">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="mt-2 text-[10px] font-medium text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
