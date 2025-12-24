import React, { ReactNode } from 'react';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
export type CardSize = 'sm' | 'md' | 'lg';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  hover?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  hover = false,
  clickable = false,
  className = '',
  onClick,
  noPadding = false,
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-300';

  const sizeClasses = {
    sm: 'rounded-xl',
    md: 'rounded-2xl',
    lg: 'rounded-3xl',
  };

  const paddingClasses = noPadding ? '' : 'p-6';

  const variantClasses = {
    default: 'bg-white border border-slate-100 shadow-sm',
    elevated: 'bg-white shadow-xl shadow-slate-200/50',
    outlined: 'bg-white border-2 border-slate-200',
    glass: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl',
    gradient: 'bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-lg',
  };

  const hoverClasses = hover
    ? 'hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-200'
    : '';

  const clickableClasses = clickable
    ? 'cursor-pointer active:scale-[0.98]'
    : '';

  const classes = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${paddingClasses}
    ${hoverClasses}
    ${clickableClasses}
    ${className}
  `;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

// Card Subcomponents
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    {children}
  </div>
);

interface CardTitleProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-sm font-black',
    md: 'text-base font-black',
    lg: 'text-xl font-black',
  };

  return (
    <h3 className={`${sizeClasses[size]} text-slate-900 uppercase tracking-tight ${className}`}>
      {children}
    </h3>
  );
};

interface CardSubtitleProps {
  children: ReactNode;
  className?: string;
}

export const CardSubtitle: React.FC<CardSubtitleProps> = ({ children, className = '' }) => (
  <p className={`text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ${className}`}>
    {children}
  </p>
);

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`mt-6 pt-6 border-t border-slate-100 flex items-center gap-4 ${className}`}>
    {children}
  </div>
);

interface CardMediaProps {
  src: string;
  alt: string;
  className?: string;
}

export const CardMedia: React.FC<CardMediaProps> = ({ src, alt, className = '' }) => (
  <div className={`aspect-video overflow-hidden rounded-t-2xl -mt-6 -mx-6 mb-6 ${className}`}>
    <img src={src} alt={alt} className="w-full h-full object-cover" />
  </div>
);

export default Card;
