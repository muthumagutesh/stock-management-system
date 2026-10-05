import React, { useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, AlertCircle, AlertTriangle } from 'lucide-react';
import { Product, Customer, SalesOrder } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface CreateSOModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onSuccess: (order: SalesOrder) => void;
}

export const CreateSOModal: React.FC<CreateSOModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onSuccess
}) => {
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState<number>(customers[0]?.id || 0);
  const [shippingAddress, setShippingAddress] = useState<string>(customers[0]?.address || '');
  const [notes, setNotes] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<any>('PAID');

  const [items, setItems] = useState<Array<{ product_id: number; quantity: number; unit_price: number; discount: number }>>(() => {
    return products.length > 0
      ? [{ product_id: products[0].id, quantity: 1, unit_price: Number(products[0].selling_price), discount: 0 }]
      : [];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCustomerChange = (newCustId: number) => {
    setCustomerId(newCustId);
    const cust = customers.find((c) => c.id === newCustId);
    if (cust?.address) {
      setShippingAddress(cust.address);
    }
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    const first = products[0];
    setItems([...items, { product_id: first.id, quantity: 1, unit_price: Number(first.selling_price), discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: number) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...items];
    updated[index].product_id = newProductId;
    if (prod) {
      updated[index].unit_price = Number(prod.selling_price);
    }
    setItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, qty);
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index].unit_price = Math.max(0, price);
    setItems(updated);
  };

  const handleDiscountChange = (index: number, disc: number) => {
    const updated = [...items];
    updated[index].discount = Math.min(100, Math.max(0, disc));
    setItems(updated);
  };

  // Stock check warning
  const stockErrors: string[] = [];
  items.forEach((item) => {
    const p = products.find((prod) => prod.id === item.product_id);
    if (p && p.quantity_on_hand < item.quantity) {
      stockErrors.push(`Requested ${item.quantity} of '${p.name}', but only ${p.quantity_on_hand} ${p.unit} in stock.`);
    }
  });

  const totalAmount = items.reduce((sum, item) => {
    const sub = item.quantity * item.unit_price;
    const disc = sub * (item.discount / 100);
    return sum + (sub - disc);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Please add at least one line item to the sales order.');
      return;
    }
    if (stockErrors.length > 0) {
      setError('Cannot place order: ' + stockErrors[0]);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const order = await api.createSalesOrder({
        customer_id: customerId || customers[0].id,
        shipping_address: shippingAddress,
        notes,
        items
      });
      toast('success', 'Sales Order Placed', `Order ${order.so_number} confirmed for $${Number(order.total_amount).toFixed(2)}.`);
      onSuccess(order);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place sales order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-heading">
                Create Customer Sales Order (SO)
              </h2>
              <p className="text-xs text-slate-500">
                Live inventory verification with instant dispatch validation.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - Credit: ${Number(c.credit_limit).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="PAID">PAID (Pre-authorized)</option>
                <option value="UNPAID">UNPAID (Net 30 Invoice)</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Destination / Shipping Address
            </label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
              placeholder="e.g. Gigafactory Assembly Bay 4, Austin TX"
            />
          </div>

          {/* Line Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Sales Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 hover:bg-violet-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.product_id);
                const isOverStock = prod && prod.quantity_on_hand < item.quantity;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isOverStock
                        ? 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex-1 w-full sm:w-auto">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) - Available: {p.quantity_on_hand} {p.unit}
                          </option>
                        ))}
                      </select>
                      {isOverStock && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Stock insufficient! Only {prod.quantity_on_hand} available on hand.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
                          placeholder="Qty"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
                          placeholder="Price ($)"
                        />
                      </div>

                      <div className="w-16">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => handleDiscountChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
                          placeholder="Disc %"
                          title="Discount %"
                        />
                      </div>

                      <div className="w-24 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        ${(item.quantity * item.unit_price * (1 - item.discount / 100)).toFixed(2)}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sales Order Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Include Certificate of Analysis, expedited freight shipping"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>

          {/* Subtotal & Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-left w-full sm:w-auto">
              <span className="text-xs text-slate-400">Total Invoice Amount</span>
              <p className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 font-heading">
                ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || stockErrors.length > 0}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/25 transition-all disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                {isSubmitting ? 'Placing Order...' : 'Confirm Sales Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
