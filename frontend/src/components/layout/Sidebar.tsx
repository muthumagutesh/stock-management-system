import React from 'react';
import {
  LayoutDashboard, Boxes, Truck, ShoppingCart,
  BrainCircuit, BarChart3, Users, History,
  ShieldCheck, X, Sparkles, Database, Layers, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, badge: null },
    { id: 'inventory', label: 'Inventory & Products', icon: Boxes, badge: 'Live' },
    { id: 'purchases', label: 'Purchase Orders', icon: Truck, badge: null },
    { id: 'sales', label: 'Sales & Invoices', icon: ShoppingCart, badge: 'GST' },
    { id: 'forecasting', label: 'AI Demand Forecast', icon: BrainCircuit, badge: 'AI' },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3, badge: null },
    { id: 'directories', label: 'Suppliers & Customers', icon: Users, badge: null },
    { id: 'audit', label: 'Audit Trail', icon: History, badge: null },
    { id: 'settings', label: 'GST & Settings', icon: Settings, badge: null },
    { id: 'admin', label: 'Admin & Users', icon: ShieldCheck, role: 'ADMIN', badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                    APEXSTOCK™
                  </span>
                </div>
                <span className="block text-[9px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                  INDIA EDITION • ₹ INR
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              if (item.role === 'ADMIN' && user?.role !== 'ADMIN' && !user?.is_admin) {
                return null;
              }

              const isActive = currentView === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.badge === 'AI'
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : item.badge === 'GST'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Health Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="font-medium truncate">Django REST + PostgreSQL</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">GSTIN: 27AAACA9999P1Z8</p>
        </div>
      </aside>
    </>
  );
};
