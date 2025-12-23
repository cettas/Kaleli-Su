
import React from 'react';
import { InventoryItem } from '../types';

interface StockWidgetProps {
  levels: InventoryItem[];
}

const StockWidget: React.FC<StockWidgetProps> = ({ levels }) => {
  const displayItems = levels.filter(i => i.isCore).concat(levels.filter(i => !i.isCore)).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-2">
      {displayItems.map(item => {
        const isFull = item.id.includes('full');
        const percent = Math.min(100, (item.quantity / 500) * 100);
        
        return (
          <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
              <span className="text-xs font-bold text-slate-900">{item.quantity}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${isFull ? 'bg-indigo-500' : 'bg-slate-400'}`} 
                style={{ width: `${percent}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockWidget;
