import React, { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: (updatedProduct: Product) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess
}) => {
  const { toast } = useToast();
  const [newQuantity, setNewQuantity] = useState<number>(product?.quantity_on_hand || 0);
  const [reason, setReason] = useState<string>('Cycle Count Discrepancy Correction');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setNewQuantity(product.quantity_on_hand);
      setReason('Cycle Count Discrepancy Correction');
      setNotes('');
      setError(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = product.quantity_on_hand;
  const delta = newQuantity - currentStock;

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuantity < 0) {
      setError('Quantity cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.adjustStock(product.id, newQuantity, reason, notes);
      toast(
        'success',
        'Stock Adjusted',
        `${product.name} updated to ${newQuantity} ${product.unit} (Delta: ${delta > 0 ? `+${delta}` : delta})`
      );
      onSuccess(response.product);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
              Physical Stock Adjustment
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              SKU: {product.sku} | {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAdjust} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
              {error}
            </div>
          )}

          {/* Current vs New Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Current On Hand</span>
              <p className="text-xl font-extrabold text-slate-700 dark:text-slate-300 font-heading mt-0.5">
                {currentStock} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">New Verified</span>
              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading mt-0.5">
                {newQuantity} <span className="text-xs font-normal text-indigo-400">{product.unit}</span>
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Difference</span>
              <p
                className={`text-xl font-extrabold font-heading mt-0.5 ${
                  delta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : delta < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Physical Count *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Cycle Count Discrepancy Correction">Cycle Count Discrepancy Correction</option>
              <option value="Damaged / Spoiled Stock Write-off">Damaged / Spoiled Stock Write-off</option>
              <option value="Supplier Over-delivery Audit">Supplier Over-delivery Audit</option>
              <option value="Internal Quality Inspection Return">Internal Quality Inspection Return</option>
              <option value="Initial Inventory Audit">Initial Inventory Audit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Notes & Reference
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified by Floor Supervisor Mike during Aisle 3 shelf inspection"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This adjustment directly records a <strong>StockMovement</strong> event and appends to the immutable enterprise audit trail.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : 'Commit Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
