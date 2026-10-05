import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, QrCode, CreditCard, Landmark } from 'lucide-react';
import { SalesOrder } from '../../types';
import { formatINR, formatIndianDate } from '../../utils/formatters';
import { api } from '../../services/api';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SalesOrder | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, order }) => {
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [razorpayData, setRazorpayData] = useState<any>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateUPI = async () => {
    setRazorpayLoading(true);
    try {
      const res = await api.createRazorpayOrder(order.id);
      setRazorpayData(res);
    } catch (err) {
      console.error('Failed to generate Razorpay UPI order', err);
    } finally {
      setRazorpayLoading(false);
    }
  };

  const taxableAmount = Number(order.taxable_amount || (Number(order.total_amount) / 1.18));
  const cgstAmount = Number(order.cgst_amount || 0);
  const sgstAmount = Number(order.sgst_amount || 0);
  const igstAmount = Number(order.igst_amount || (Number(order.total_amount) - taxableAmount));
  const totalAmount = Number(order.total_amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="no-print flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Tax Invoice</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {order.so_number}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              GSTIN: 27AAACA9999P1Z8
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateUPI}
              disabled={razorpayLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <CreditCard className="w-3.5 h-3.5" />
              {razorpayLoading ? 'Creating UPI...' : razorpayData ? 'UPI Link Ready' : 'UPI / Razorpay'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Razorpay UPI Intent Banner if triggered */}
        {razorpayData && (
          <div className="no-print bg-violet-50 dark:bg-violet-950/40 p-4 border-b border-violet-200 dark:border-violet-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs font-bold text-violet-900 dark:text-violet-200">
                  Razorpay UPI Payment Request Generated (Order ID: {razorpayData.razorpay_order_id})
                </p>
                <p className="text-[11px] text-violet-700 dark:text-violet-400 font-mono">
                  Scan via GPay, PhonePe, Paytm, or BHIM: {razorpayData.upi_intent_uri}
                </p>
              </div>
            </div>
            <a
              href={razorpayData.upi_intent_uri}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            >
              Pay Now via UPI
            </a>
          </div>
        )}

        {/* Printable GST Tax Invoice Sheet */}
        <div className="p-8 text-slate-800 dark:text-slate-200 print:text-black print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6 border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
                  APEXSTOCK™ INDIA
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                  Pvt Ltd
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                ApexStock Industrial Solutions India Private Limited
              </p>
              <p className="text-xs text-slate-500">Plot 42, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026</p>
              <div className="grid grid-cols-2 gap-x-4 text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                <span>GSTIN: <strong>27AAACA9999P1Z8</strong></span>
                <span>PAN: <strong>AAACA9999P</strong></span>
                <span>State: <strong>Maharashtra (Code 27)</strong></span>
                <span>Phone: <strong>+91 20 6789 0100</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading block">
                TAX INVOICE
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">(Original for Recipient)</p>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-2">
                Invoice No: {order.so_number}
              </p>
              <p className="text-xs text-slate-500">Date: {formatIndianDate(order.order_date)}</p>
              {order.e_way_bill_number && (
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  e-Way Bill: {order.e_way_bill_number}
                </p>
              )}
              <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                STATUS: {order.status} • {order.payment_status}
              </div>
            </div>
          </div>

          {/* Billed To & Shipped To */}
          <div className="grid grid-cols-2 gap-8 my-6 text-xs border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Details of Receiver (Billed To)</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{order.customer_name}</p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">{order.shipping_address || 'Customer Industrial Facility'}</p>
              <div className="mt-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                <p>GSTIN: <strong>{order.customer_gstin || '27AABCT1234D1Z5'}</strong></p>
                <p>State: <strong>{order.is_inter_state ? 'Inter-State (IGST Applicable)' : 'Maharashtra (Code 27 - CGST+SGST)'}</strong></p>
              </div>
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Dispatch & Settlement Details</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Dispatch Facility: Pune Central Hub</p>
                <p className="text-slate-500">Tax Type: {order.is_inter_state ? 'Inter-State IGST' : 'Intra-State CGST + SGST'}</p>
                <p className="text-slate-500">Handled by: {order.created_by_name || 'Enterprise System'}</p>
              </div>

              <div className="mt-2 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Place of Supply</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {order.is_inter_state ? 'Inter-State Consignee' : 'Maharashtra (27)'}
                </p>
              </div>
            </div>
          </div>

          {/* GST Table */}
          <table className="w-full text-xs text-left mb-6 border-collapse">
            <thead>
              <tr className="border-y border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">Item Description</th>
                <th className="py-2.5 px-2">HSN/SAC</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-2 text-right">Unit Rate (₹)</th>
                <th className="py-2.5 px-2 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-2 text-center">GST %</th>
                <th className="py-2.5 px-2 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items?.map((item, index) => {
                const itemTaxable = Number(item.unit_price) * item.quantity;
                const itemTotal = Number(item.total_price);
                return (
                  <tr key={item.id}>
                    <td className="py-3 px-2 text-slate-400">{index + 1}</td>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{item.product_name}</p>
                      <span className="font-mono text-[10px] text-slate-400">{item.product_sku}</span>
                    </td>
                    <td className="py-3 px-2 font-mono font-medium text-slate-700 dark:text-slate-300">
                      8501
                    </td>
                    <td className="py-3 px-2 text-center font-bold">
                      {item.quantity} {item.product_unit}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">{formatINR(item.unit_price)}</td>
                    <td className="py-3 px-2 text-right font-mono">{formatINR(itemTaxable)}</td>
                    <td className="py-3 px-2 text-center font-semibold text-indigo-600">18%</td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(itemTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Tax Breakdown & Grand Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-200 dark:border-slate-800 pt-4">
            {/* Left: Bank & UPI Payment Details */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">Bank & NEFT / RTGS Details</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <p>Bank: <strong>ICICI Bank Industrial Branch Pune</strong></p>
                <p>A/C Name: <strong>ApexStock Industrial Solutions India Pvt Ltd</strong></p>
                <p>A/C Number: <strong>000405001234</strong></p>
                <p>IFSC Code: <strong>ICIC0000004</strong></p>
                <p>UPI VPA: <strong>apexstock@icici</strong></p>
              </div>
            </div>

            {/* Right: GST Totals */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Total Taxable Value:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatINR(taxableAmount)}
                </span>
              </div>

              {order.is_inter_state ? (
                <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                  <span>Integrated GST (IGST @ 18%):</span>
                  <span className="font-mono font-semibold">{formatINR(igstAmount)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                    <span>Central GST (CGST @ 9%):</span>
                    <span className="font-mono font-semibold">{formatINR(cgstAmount || (taxableAmount * 0.09))}</span>
                  </div>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400">
                    <span>State GST (SGST @ 9%):</span>
                    <span className="font-mono font-semibold">{formatINR(sgstAmount || (taxableAmount * 0.09))}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2 border-t text-sm font-bold text-slate-900 dark:text-slate-100">
                <span>Invoice Total (INR):</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-lg">
                  {formatINR(totalAmount)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic text-right">
                All amounts in Indian Rupees (₹)
              </p>
            </div>
          </div>

          {/* Signatory Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-400">
              <p>Terms: Payment due within 30 days of invoice date.</p>
              <p>Subject to Pune, Maharashtra jurisdiction only.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-700 dark:text-slate-300">For ApexStock Industrial Solutions India Pvt Ltd</p>
              <div className="h-10"></div>
              <p className="text-[11px] text-slate-400 border-t border-slate-300 dark:border-slate-700 pt-1">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
