import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SAMPLE_CSV = `sku,name,category,cost_price,selling_price,hsn_code,gst_rate,mrp,quantity,reorder_level,location,description
IND-BEARING-6204,Deep Groove Ball Bearing 6204-2Z,Industrial Robotics & Automation,480.00,890.00,8482,18,950.00,120,30,Pune Bay C-1,High precision chrome steel bearing
IND-ALUM-SHEET,Anodized Aluminum Alloy Plate 5mm,Precision Machining & Tooling,1450.00,2650.00,7606,18,2900.00,45,15,Pune Bay D-4,Aerospace grade 6061-T6 alloy`;

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setError('Please provide CSV data.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await api.bulkUploadProducts(csvContent);
      toast('success', 'Bulk Ingestion Complete', `Created ${res.created} products, updated ${res.updated} products.`);
      if (res.errors && res.errors.length > 0) {
        toast('info', 'Bulk Import Warnings', `${res.errors.length} rows had warnings.`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                Bulk Import Products (CSV / Excel)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste or upload CSV with HSN codes, GST tax rates, and ₹ pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Upload .csv File (or paste text below)
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950/70 dark:file:text-indigo-300"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                CSV Data Preview & Editor
              </label>
              <button
                type="button"
                onClick={() => setCsvContent(SAMPLE_CSV)}
                className="text-[11px] font-medium text-indigo-600 hover:underline"
              >
                Reset to Sample
              </button>
            </div>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="sku,name,category,cost_price,selling_price,hsn_code,gst_rate,mrp,quantity,reorder_level,location,description"
            />
          </div>

          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">Required Headers:</p>
            <p className="font-mono text-[11px]">sku, name, cost_price, selling_price, hsn_code, gst_rate, quantity</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Importing Products...' : 'Ingest Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
