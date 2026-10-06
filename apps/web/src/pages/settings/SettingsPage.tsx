import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  AlertTriangle,
  Receipt,
  Percent,
  CheckCircle2,
  Save,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  SystemSettingsDto,
  UpdateSettingsInput,
  UserRole,
} from '@pharmacy/shared';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN;

  const [formData, setFormData] = useState<SystemSettingsDto>({
    expiryWarningMonths: 3,
    maxDiscountCashier: 5,
    maxDiscountPharmacist: 20,
    maxDiscountAdmin: 100,
    looseSellingDefault: false,
    receiptHeaderName: 'PharmaCare Pharmacy',
    receiptHeaderAddress: 'Main Boulevard, Gulberg III, Lahore',
    receiptHeaderPhone: '+92 42 3578 9000',
    receiptHeaderNtn: 'NTN: 8945210-7',
    receiptFooterMsg:
      'Thank you for choosing PharmaCare! Medicines once sold cannot be returned without original receipt.',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch settings from API
  const { data: settingsData } = useQuery<{
    success: boolean;
    data: SystemSettingsDto;
  }>({
    queryKey: ['system-settings'],
    queryFn: () => apiFetch('/api/settings'),
  });

  useEffect(() => {
    if (settingsData?.data) {
      setFormData(settingsData.data);
    }
  }, [settingsData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateSettingsInput) => {
      const res = await apiFetch<{ success: boolean; data: SystemSettingsDto }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['system-settings'], { success: true, data });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settingsData?.data) {
      setFormData(settingsData.data);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-pharma-danger flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-pharma-text">Access Restricted</h2>
        <p className="text-xs text-pharma-muted max-w-sm mx-auto">
          System settings and global compliance parameters can only be altered by an Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
          <Sliders className="w-6 h-6 text-pharma-primary" />
          System Configuration & Settings
        </h1>
        <p className="text-xs text-pharma-muted mt-0.5">
          Global policies for expiry alerts, role discount guardrails, loose unit dispensing, and thermal receipt typography.
        </p>
      </div>

      {saveSuccess && (
        <div className="bg-pharma-surface border border-pharma-primary/30 p-3 rounded-xl flex items-center gap-2 text-xs text-pharma-text">
          <CheckCircle2 className="w-4 h-4 text-pharma-primary shrink-0" />
          <span className="font-semibold">System settings successfully saved and applied to the database.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Section 1: Expiry Alerts ── */}
        <div className="pharma-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-pharma-surface pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-pharma-text">Expiry & Shelf Life Controls</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-pharma-text mb-1">
                Near-Expiry Alert Window (Months)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={formData.expiryWarningMonths}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiryWarningMonths: parseInt(e.target.value) || 3,
                  }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
              <p className="text-[10px] text-pharma-muted mt-1">
                Batches expiring within this number of months are flagged as Near-Expiry on POS and inventory screens.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">
                Default Loose Unit Selling
              </label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="looseSellingDefault"
                  checked={formData.looseSellingDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      looseSellingDefault: e.target.checked,
                    }))
                  }
                  className="rounded text-pharma-primary focus:ring-pharma-primary w-4 h-4"
                />
                <label htmlFor="looseSellingDefault" className="text-xs text-pharma-text cursor-pointer">
                  Enable loose selling (per-tablet/blister) by default for new catalog entries
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Role Discount Limits ── */}
        <div className="pharma-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-pharma-surface pb-3">
            <Percent className="w-4 h-4 text-pharma-primary" />
            <h2 className="text-sm font-bold text-pharma-text">Role-Based Maximum Discount Guardrails</h2>
          </div>

          <p className="text-xs text-pharma-muted">
            The system strictly rejects discounts exceeding these role caps on both the client POS screen and server APIs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-pharma-text mb-1">
                Cashier Max Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.maxDiscountCashier}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxDiscountCashier: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
              <span className="text-[10px] text-pharma-muted">Standard cashier limit (e.g. 5%)</span>
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">
                Pharmacist / Manager Max Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.maxDiscountPharmacist}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxDiscountPharmacist: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
              <span className="text-[10px] text-pharma-muted">Supervisory override cap (e.g. 20%)</span>
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">
                Admin Max Discount (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.maxDiscountAdmin}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxDiscountAdmin: parseFloat(e.target.value) || 100,
                  }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
              <span className="text-[10px] text-pharma-muted">Full administrative allowance (100%)</span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Receipt Header & Typography ── */}
        <div className="pharma-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-pharma-surface pb-3">
            <Receipt className="w-4 h-4 text-pharma-primary" />
            <h2 className="text-sm font-bold text-pharma-text">Thermal Receipt Layout (58mm / 80mm)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-pharma-text mb-1">Pharmacy Trade Name</label>
              <input
                type="text"
                value={formData.receiptHeaderName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiptHeaderName: e.target.value }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.receiptHeaderPhone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiptHeaderPhone: e.target.value }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">Physical Address</label>
              <input
                type="text"
                value={formData.receiptHeaderAddress}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiptHeaderAddress: e.target.value }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
            </div>

            <div>
              <label className="block font-semibold text-pharma-text mb-1">NTN / Sales Tax ID</label>
              <input
                type="text"
                value={formData.receiptHeaderNtn}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiptHeaderNtn: e.target.value }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-pharma-text mb-1">Receipt Footer Policy Message</label>
              <textarea
                rows={2}
                value={formData.receiptFooterMsg}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, receiptFooterMsg: e.target.value }))
                }
                className="w-full bg-white border border-pharma-muted/30 rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-pharma-primary"
              />
            </div>
          </div>
        </div>

        {/* ── Form Actions Bar (Design System: Save Green + Cancel Pair) ── */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saveMutation.isPending ? 'Saving Changes...' : 'Save Configuration'}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReset}
            className="w-36 text-pharma-danger border-pharma-danger/30 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
};
