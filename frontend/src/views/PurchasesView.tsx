import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Search, CheckCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp, PackageCheck, Download,
  Receipt, FileCheck
} from 'lucide-react';
import { PurchaseOrder, Supplier, Product } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { CreatePOModal } from '../components/modals/CreatePOModal';
import { formatINR, formatIndianDate } from '../utils/formatters';

export const PurchasesView: React.FC = () => {
  const { user } = useAuth();
  const { toast, success } = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingId, setReceivingId] = useState<number | null>(null);

  const canReceive = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.is_admin;

  const loadData = async () => {
    try {
      const [pos, sups, prods] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers(),
        api.getProducts()
      ]);
      setOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err: any) {
      toast('error', 'Failed to load purchase orders', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time events
    const unsub = wsService.subscribe('*', (eventData: any) => {
      if (eventData.event === 'po_created' || eventData.event === 'po_received') {
        loadData();
      }
    });

    return () => unsub();
  }, []);

  const handleReceiveOrder = async (order: PurchaseOrder) => {
    if (!window.confirm(`Confirm delivery receipt for PO ${order.po_number}? This will automatically add ${order.items?.reduce((s, i) => s + i.quantity_ordered, 0)} units into active inventory at Pune plant.`)) {
      return;
    }
    setReceivingId(order.id);
    try {
      const res = await api.receivePurchaseOrder(order.id);
      success('Stock Received & Updated', res.message || `PO ${order.po_number} marked as fulfilled.`);
      await loadData();
    } catch (err: any) {
      toast('error', 'Receive Failed', err.message);
    } finally {
      setReceivingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.supplier_gstin && o.supplier_gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
              Supplier Purchase Orders (PO)
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              GST Inbound (₹ INR)
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track industrial supplier shipments, e-Way bills, dock arrivals, and auto-increment warehouse inventory.
          </p>
        </div>

        {canReceive && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Issue Purchase Order
          </button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Orders', count: orders.length },
            { id: 'ORDERED', label: 'Inbound / In Transit', count: orders.filter((o) => o.status === 'ORDERED').length },
            { id: 'RECEIVED', label: 'Received & Stocked', count: orders.filter((o) => o.status === 'RECEIVED').length },
            { id: 'DRAFT', label: 'Drafts', count: orders.filter((o) => o.status === 'DRAFT').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
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
            placeholder="Search by PO Number (e.g. PO-IN-2026-0001), Supplier, GSTIN, or e-Way Bill..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl text-slate-500">
            <Truck className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No purchase orders found matching this view.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isReceived = order.status === 'RECEIVED';
            const isOrdered = order.status === 'ORDERED';

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
                        isReceived
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : isOrdered
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Truck className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-extrabold text-base text-slate-900 dark:text-slate-100">
                          {order.po_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isOrdered
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {order.status}
                        </span>
                        {order.is_inter_state ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            IGST Inter-State
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            CGST+SGST Intra-State
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        Supplier: {order.supplier_name}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span>Ordered: {formatIndianDate(order.ordered_date)}</span>
                        {order.expected_delivery_date && (
                          <span>ETA: {formatIndianDate(order.expected_delivery_date)}</span>
                        )}
                        {order.e_way_bill_number && (
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            e-Way: {order.e_way_bill_number}
                          </span>
                        )}
                        <span>Lines: {order.items?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Total & Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Inbound (₹)</span>
                      <p className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
                        {formatINR(order.total_amount)}
                      </p>
                      <span className="text-[10px] text-slate-400">Incl. GST Breakdown</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOrdered && canReceive && (
                        <button
                          onClick={() => handleReceiveOrder(order)}
                          disabled={receivingId === order.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          <PackageCheck className="w-4 h-4" />
                          {receivingId === order.id ? 'Updating Stock...' : 'Receive Stock'}
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
                      <h4 className="font-bold text-slate-900 dark:text-slate-100">Order Line Items & HSN Mapping</h4>
                      {order.supplier_gstin && (
                        <span className="font-mono text-[11px] text-slate-500">
                          Supplier GSTIN: <strong>{order.supplier_gstin}</strong>
                        </span>
                      )}
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2">Product Name / SKU</th>
                          <th className="py-2 text-center">Qty Ordered</th>
                          <th className="py-2 text-center">Qty Received</th>
                          <th className="py-2 text-right">Unit Cost (₹)</th>
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
                            <td className="py-2.5 text-center font-bold">
                              {item.quantity_ordered} {item.product_unit}
                            </td>
                            <td className="py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {item.quantity_received} {item.product_unit}
                            </td>
                            <td className="py-2.5 text-right font-mono">{formatINR(item.unit_cost)}</td>
                            <td className="py-2.5 text-right font-mono font-bold">{formatINR(item.total_cost)}</td>
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

      {/* Modal */}
      <CreatePOModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        suppliers={suppliers}
        products={products}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
