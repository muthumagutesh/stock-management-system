import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Plus, Edit2, Sliders, Trash2,
  Download, FileText, ArrowUpDown, RefreshCw, Barcode, Boxes,
  QrCode, Upload, Sparkles
} from 'lucide-react';
import { Product, Category, StockStatus } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { StockBadge } from '../components/common/StockBadge';
import { ProductModal } from '../components/modals/ProductModal';
import { StockAdjustmentModal } from '../components/modals/StockAdjustmentModal';
import { BulkUploadModal } from '../components/modals/BulkUploadModal';
import { QRCodeModal } from '../components/modals/QRCodeModal';
import { formatINR } from '../utils/formatters';

export const ProductsView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);

  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.is_admin;

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      toast('error', 'Failed to load products', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time stock sync
    const unsub = wsService.subscribe('*', (eventData: any) => {
      if (
        eventData.event === 'stock_level_changed' ||
        eventData.event === 'product_created' ||
        eventData.event === 'product_updated' ||
        eventData.event === 'po_received' ||
        eventData.event === 'so_fulfilled'
      ) {
        loadData();
      }
    });

    return () => unsub();
  }, []);

  const handleCreate = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleAdjust = (prod: Product) => {
    setAdjustingProduct(prod);
    setIsAdjustModalOpen(true);
  };

  const handleDelete = async (prod: Product) => {
    if (!window.confirm(`Are you sure you want to delete product '${prod.name}' (${prod.sku})?`)) {
      return;
    }
    try {
      await api.deleteProduct(prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      toast('success', 'Product Deleted', `Removed ${prod.name} from catalog.`);
    } catch (err: any) {
      toast('error', 'Delete Failed', err.message);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.hsn_code && p.hsn_code.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      p.location.toLowerCase().includes(query);

    const matchesCat = !selectedCategory || String(p.category) === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || p.stock_status === selectedStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              Indian Industrial Catalog & Stock
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
              ₹ INR • GST Compliant
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time catalog of {products.length} SKUs mapped with HSN/SAC codes, GST slabs, and cycle count tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                Bulk CSV Import
              </button>

              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </>
          )}

          {/* Export Dropdown */}
          <div className="flex items-center gap-1.5">
            <a
              href={api.getExportCSVUrl()}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              CSV
            </a>

            <a
              href={api.getExportPDFUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
              title="Export PDF Report"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              PDF
            </a>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, HSN code (e.g. 7208), barcode, or bay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="OPTIMAL">Optimal Level</option>
            <option value="LOW_STOCK">Low Stock Alert</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="OVERSTOCKED">Overstocked</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">SKU / Item Name</th>
                <th className="py-3 px-4">HSN & GST</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                <th className="py-3 px-4 text-right">Valuation (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    No products found matching the search criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Name & SKU */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                            {p.sku}
                          </span>
                          {p.batch_number && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Lot: {p.batch_number}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">Loc: {p.location}</span>
                        </div>
                      </div>
                    </td>

                    {/* HSN & GST Rate */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          HSN: {p.hsn_code || '8501'}
                        </span>
                        <span className="inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {p.gst_rate || 18}% GST
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.category_name || 'Industrial'}
                      </span>
                    </td>

                    {/* Stock Level */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-block">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 font-heading">
                          {p.quantity_on_hand}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{p.unit}</span>
                        <div className="text-[10px] text-slate-400">Min: {p.min_stock_level}</div>
                      </div>
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3.5 px-4">
                      <StockBadge status={p.stock_status} />
                    </td>

                    {/* Cost Price */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      {formatINR(p.cost_price)}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(p.selling_price)}
                    </td>

                    {/* Valuation */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(p.total_cost_value)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setQrProduct(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                          title="Generate QR / Barcode Tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleAdjust(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                          title="Audit Stock Adjustment"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSuccess={() => loadData()}
      />

      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        product={adjustingProduct}
        onSuccess={() => loadData()}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <QRCodeModal
        isOpen={!!qrProduct}
        onClose={() => setQrProduct(null)}
        product={qrProduct}
      />
    </div>
  );
};
