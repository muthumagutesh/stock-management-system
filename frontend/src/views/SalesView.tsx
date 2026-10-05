import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, Search, FileText, CheckCircle2,
  Clock, Send, ChevronDown, ChevronUp, AlertCircle, ArrowUpRight,
  CreditCard, ShieldCheck
} from 'lucide-react';
import { SalesOrder, Customer, Product } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { CreateSOModal } from '../components/modals/CreateSOModal';
import { InvoiceModal } from '../components/modals/InvoiceModal';
import { formatINR, formatIndianDate } from '../utils/formatters';

export const SalesView: React.FC = () => {
  const { user } = useAuth();
  const { toast, success } = useToast();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<SalesOrder | null>(null);
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);

  const canFulfill = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.is_admin;

  const loadData = async () => {
    try {
      const [sos, custs, prods] = await Promise.all([
        api.getSalesOrders(),
        api.getCustomers(),
        api.getProducts()
      ]);
      setOrders(sos);
      setCustomers(custs);
      setProducts(prods);
    } catch (err: any) {
      toast('error', 'Failed to load sales orders', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time events
    const unsub = wsService.subscribe('*', (eventData: any) => {
      if (eventData.event === 'so_created' || eventData.event === 'so_fulfilled') {
        loadData();
      }
    });

    return () => unsub();
  }, []);

  const handleFulfillOrder = async (order: SalesOrder) => {
    if (!window.confirm(`Fulfill and dispatch Sales Order ${order.so_number}? This will decrement inventory from on-hand stock and generate outbound movement logs.`)) {
      return;
    }
    setFulfillingId(order.id);
    try {
      const res = await api.fulfillSalesOrder(order.id);
      success('Order Dispatched', res.message || `Order ${order.so_number} marked as fulfilled & shipped.`);
      await loadData();
    } catch (err: any) {
      toast('error', 'Fulfillment Failed', err.message);
    } finally {
      setFulfillingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.so_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_gstin && o.customer_gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.e_way_bill_number && o.e_way_bill_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.notes && o.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              Customer Sales Orders & Tax Invoices
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              ₹ INR • GST Invoicing
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch fulfillment pipeline, GST tax invoice generation, UPI/Razorpay payment tracking, and e-Way bill audit.
          </p>
        </div>

        {canFulfill && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Sales Order
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Orders', count: orders.length },
            { id: 'PROCESSING', label: 'Processing & Pick', count: orders.filter((o) => o.status === 'PROCESSING').length },
            { id: 'SHIPPED', label: 'Dispatched / In Transit', count: orders.filter((o) => o.status === 'SHIPPED').length },
            { id: 'DELIVERED', label: 'Delivered', count: orders.filter((o) => o.status === 'DELIVERED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-violet-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by SO Number (e.g. SO-IN-2026-0001), Customer, GSTIN, or e-Way Bill..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-slate-500">
            <ShoppingCart className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No sales orders found matching this view.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isProcessing = order.status === 'PROCESSING';
            const isShipped = order.status === 'SHIPPED';
            const isDelivered = order.status === 'DELIVERED';

            return (
              <div
                key={order.id}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-sm hover:shadow-md"
              >
                {/* Main Card Summary */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isDelivered
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : isShipped
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <ShoppingCart className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-extrabold text-base text-slate-900 dark:text-slate-100">
                          {order.so_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isShipped
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.payment_status === 'PAID'
                              ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {order.payment_status}
                        </span>
                        {order.is_inter_state ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            IGST (Inter-State)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            CGST+SGST (Intra-State)
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        Customer: {order.customer_name}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span>Ordered: {formatIndianDate(order.order_date)}</span>
                        {order.e_way_bill_number && (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            e-Way: {order.e_way_bill_number}
                          </span>
                        )}
                        <span>Destination: {order.shipping_address || 'Facility Dock'}</span>
                        <span>Lines: {order.items?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Total & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed (₹)</span>
                      <p className="font-mono text-xl font-extrabold text-violet-600 dark:text-violet-400 font-heading">
                        {formatINR(order.total_amount)}
                      </p>
                      <span className="text-[10px] text-slate-400">Incl. GST</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInvoiceOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-sm"
                        title="View GST Tax Invoice"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        GST Invoice
                      </button>

                      {isProcessing && canFulfill && (
                        <button
                          onClick={() => handleFulfillOrder(order)}
                          disabled={fulfillingId === order.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {fulfillingId === order.id ? 'Dispatching...' : 'Dispatch Order'}
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        title="Toggle Line Items"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Line Items Detail */}
                {isExpanded && (
                  <div className="bg-slate-50/70 dark:bg-slate-850/60 p-5 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">Order Line Items & HSN Tax Breakdown</h4>
                      {order.customer_gstin && (
                        <span className="font-mono text-[11px] text-slate-500">
                          Customer GSTIN: <strong>{order.customer_gstin}</strong>
                        </span>
                      )}
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2">Product Name / SKU</th>
                          <th className="py-2 text-center">Unit Price (₹)</th>
                          <th className="py-2 text-center">Quantity</th>
                          <th className="py-2 text-center">Disc (%)</th>
                          <th className="py-2 text-right">Line Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {order.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                {item.product_name}
                              </span>
                              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                                {item.product_sku}
                              </span>
                            </td>
                            <td className="py-2.5 text-center font-mono">{formatINR(item.unit_price)}</td>
                            <td className="py-2.5 text-center font-bold">
                              {item.quantity} {item.product_unit}
                            </td>
                            <td className="py-2.5 text-center">{Number(item.discount || 0)}%</td>
                            <td className="py-2.5 text-right font-mono font-bold">{formatINR(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {order.notes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Notes: </span>
                        {order.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateSOModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        customers={customers}
        products={products}
        onSuccess={() => loadData()}
      />

      <InvoiceModal
        isOpen={!!invoiceOrder}
        onClose={() => setInvoiceOrder(null)}
        order={invoiceOrder}
      />
    </div>
  );
};
