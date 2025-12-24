import React from 'react';

export type OrderStatusType = 'Bekliyor' | 'Yolda' | 'Teslim Edildi' | 'İptal';

interface StatusBadgeProps {
  status: OrderStatusType;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusConfig = {
    'Bekliyor': {
      icon: 'fa-clock',
      emoji: '⏱',
      classes: 'bg-amber-100 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    'Yolda': {
      icon: 'fa-truck',
      emoji: '🚚',
      classes: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500',
    },
    'Teslim Edildi': {
      icon: 'fa-check-circle',
      emoji: '✅',
      classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    'İptal': {
      icon: 'fa-times-circle',
      emoji: '❌',
      classes: 'bg-rose-100 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1
        text-[10px] font-black uppercase tracking-wider
        border rounded-lg
        ${config.classes}
        ${className}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full {config.dot}" />
      {config.emoji} {status}
    </span>
  );
};

export default StatusBadge;
