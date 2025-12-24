import React from 'react';

interface LoadingScreenProps {
  fullScreen?: boolean;
  message?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  fullScreen = true,
  message = 'Yükleniyor...',
  variant = 'spinner',
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900'
    : 'flex items-center justify-center py-12';

  const variants = {
    spinner: (
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-500/30 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" />
      </div>
    ),
    dots: (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ),
    pulse: (
      <div className="relative">
        <div className="w-16 h-16 bg-indigo-500 rounded-3xl animate-pulse" />
        <div className="absolute inset-0 bg-indigo-500 rounded-3xl animate-ping opacity-20" />
      </div>
    ),
    skeleton: (
      <div className="space-y-3 w-64">
        <div className="h-4 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    ),
  };

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-6">
        {variants[variant]}
        {message && (
          <p className="text-sm font-bold text-white uppercase tracking-widest animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
