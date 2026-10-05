import React, { useState, useEffect } from 'react';
import { X, Printer, QrCode, Download, Copy, Check } from 'lucide-react';
import { Product } from '../../types';
import { api } from '../../services/api';
import { formatINR } from '../../utils/formatters';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setIsLoading(true);
      api.getProductQRCode(product.id)
        .then((res) => {
          setQrBase64(res.qr_base64);
        })
        .catch((err) => {
          console.error('Failed to load QR code', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setQrBase64(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySKU = () => {
    navigator.clipboard.writeText(product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 font-heading text-sm">
                Industrial SKU QR Label
              </h3>
              <p className="text-[11px] text-slate-500">GS1 / GST Standard Warehouse Tag</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Label Card */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 w-full max-w-xs shadow-inner">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              APEXSTOCK™ INDIA
            </div>

            {isLoading ? (
              <div className="w-44 h-44 mx-auto flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : qrBase64 ? (
              <img
                src={`data:image/png;base64,${qrBase64}`}
                alt={`QR code for ${product.sku}`}
                className="w-44 h-44 mx-auto rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-44 h-44 mx-auto flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}

            <div className="mt-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-heading">
                {product.name}
              </h4>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {product.sku}
                </span>
                <button
                  onClick={handleCopySKU}
                  className="p-0.5 text-slate-400 hover:text-indigo-600"
                  title="Copy SKU"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">HSN Code</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {product.hsn_code || '8501'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">GST Rate</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {product.gst_rate || 18}%
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Selling Price</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(product.selling_price)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase">Location</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {product.location}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 w-full max-w-xs">
            {qrBase64 && (
              <a
                href={`data:image/png;base64,${qrBase64}`}
                download={`qr-${product.sku}.png`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Save PNG
              </a>
            )}
            <button
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Tag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
