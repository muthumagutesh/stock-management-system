import React, { useState, useEffect } from 'react';
import {
  Building2, ShieldCheck, Key, Smartphone,
  Save, Landmark, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CompanySettings } from '../types';

export const SettingsView: React.FC = () => {
  const { toast, success } = useToast();
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'ApexStock Industrial Solutions India Pvt Ltd',
    gstin: '27AAACA9999P1Z8',
    state: 'Maharashtra (27)',
    pan: 'AAACA9999P',
    address: 'Plot 42, MIDC Bhosari Industrial Area, Pune, Maharashtra 411026',
    currency: 'INR',
    currency_symbol: '₹',
    phone: '+91 20 6789 0100',
    email: 'gst-support@apexstock.in',
    sms_gateway: 'MSG91 Enterprise (Active)',
    payment_gateway: 'Razorpay India (Enabled for UPI / NetBanking / Cards)',
    e_way_bill_active: true,
    default_gst_rate: 18.0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getCompanySettings()
      .then((data) => {
        setSettings(data);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.updateCompanySettings(settings);
      setSettings(updated);
      success('Settings Updated', 'Company profile, GSTIN configuration, and gateway keys saved.');
    } catch (err: any) {
      toast('error', 'Update Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Configuration Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            System & Enterprise Configuration
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            India Edition
          </span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          GSTIN tax registration, SMS / Razorpay payment gateways, and security policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: GST & Corporate Identity */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Corporate GSTIN & Legal Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                required
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN (Goods and Services Tax ID) *
              </label>
              <input
                type="text"
                required
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-indigo-600 dark:text-indigo-400 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                required
                value={settings.pan}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GST Jurisdiction State
              </label>
              <input
                type="text"
                required
                value={settings.state}
                onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Headquarters Registered Office Address
              </label>
              <input
                type="text"
                required
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Gateways & Integrations */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Payment & Communications Gateways
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Gateway Integration
              </label>
              <input
                type="text"
                value={settings.payment_gateway}
                onChange={(e) => setSettings({ ...settings, payment_gateway: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Enables instant UPI QR codes & NetBanking checkouts on sales invoices.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SMS Gateway Provider (DLT Compliant)
              </label>
              <input
                type="text"
                value={settings.sms_gateway}
                onChange={(e) => setSettings({ ...settings, sms_gateway: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Dispatches stockout and purchase order SMS notifications to warehouse managers.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Standard GST Rate (%)
              </label>
              <select
                value={settings.default_gst_rate}
                onChange={(e) => setSettings({ ...settings, default_gst_rate: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST (Standard)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input
                type="checkbox"
                id="eway"
                checked={settings.e_way_bill_active}
                onChange={(e) => setSettings({ ...settings, e_way_bill_active: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="eway" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Automated e-Way Bill Generation & Tracking (&gt; ₹50,000 dispatches)
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Security & RBAC */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Security, 2FA & Access Control
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Two-Factor Authentication (2FA)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">TOTP Authenticator app requirement for Admin & Managers.</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700">
                  Enforced
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">ERP Integration API Keys</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Automated sync with TallyPrime & SAP ECC/HANA.</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700">
                  Active (3 keys)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Configuration...' : 'Save Enterprise Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
