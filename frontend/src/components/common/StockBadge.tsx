import React from 'react';
import { StockStatus } from '../../types';

interface StockBadgeProps {
  status: StockStatus;
  quantity?: number;
  unit?: string;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, quantity, unit }) => {
  switch (status) {
    case 'OUT_OF_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Out of Stock {quantity !== undefined && `(0 ${unit || 'units'})`}
        </span>
      );
    case 'LOW_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          Low Stock {quantity !== undefined && `(${quantity} ${unit || 'units'})`}
        </span>
      );
    case 'OVERSTOCKED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Overstocked {quantity !== undefined && `(${quantity} ${unit || 'units'})`}
        </span>
      );
    case 'OPTIMAL':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Optimal {quantity !== undefined && `(${quantity} ${unit || 'units'})`}
        </span>
      );
  }
};
