import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  XCircle,
  Search,
  Download,
  Printer,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '@pharmacy/shared';
import type { PrescriptionDto, ControlledDrugRegisterEntryDto } from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type ComplianceTab = 'prescriptions' | 'controlled-drugs';

const DRUG_CLASS_COLORS: Record<string, string> = {
  NARCOTIC: 'bg-red-100 text-red-800 border-red-300',
  PSYCHOTROPIC: 'bg-pharma-surface text-pharma-text border-pharma-primary/20',
  PRECURSOR: 'bg-amber-100 text-amber-800 border-amber-300',
  CONTROLLED: 'bg-pharma-primary/10 text-pharma-primary border-pharma-primary/30',
};

function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Prescription Capture Modal ───────────────────────────────────────────────
const PrescriptionModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [form, setForm] = useState({
    doctorName: '',
    doctorRegNo: '',
    doctorHospital: '',
    patientName: '',
    patientCnic: '',
    patientPhone: '',
    patientAge: '',
    patientGender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    saleId: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      doctorName: form.doctorName,
      doctorRegNo: form.doctorRegNo || undefined,
      doctorHospital: form.doctorHospital || undefined,
      patientName: form.patientName,
      patientCnic: form.patientCnic || undefined,
      patientPhone: form.patientPhone || undefined,
      patientAge: form.patientAge ? parseInt(form.patientAge) : undefined,
      patientGender: form.patientGender,
      saleId: form.saleId || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="p-5 border-b border-pharma-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
            <FileText className="w-4 h-4 text-pharma-primary" />
            Capture Prescription Record
          </h3>
          <button onClick={onClose} className="text-pharma-muted hover:text-pharma-text">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Doctor Section */}
          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">Prescribing Doctor</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Doctor Name *</label>
                <input
                  type="text"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  placeholder="Dr. Salman Farooq"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">PMDC Reg #</label>
                <input
                  type="text"
                  value={form.doctorRegNo}
                  onChange={(e) => setForm({ ...form, doctorRegNo: e.target.value })}
                  placeholder="PMDC-12345"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Hospital / Clinic</label>
              <input
                type="text"
                value={form.doctorHospital}
                onChange={(e) => setForm({ ...form, doctorHospital: e.target.value })}
                placeholder="Ittefaq Hospital, Lahore"
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
          </div>

          {/* Patient Section */}
          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">Patient Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Patient Name *</label>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  placeholder="Muhammad Arif"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">CNIC</label>
                <input
                  type="text"
                  value={form.patientCnic}
                  onChange={(e) => setForm({ ...form, patientCnic: e.target.value })}
                  placeholder="35201-1234567-9"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Phone</label>
                <input
                  type="text"
                  value={form.patientPhone}
                  onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                  placeholder="0321-4567890"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.patientAge}
                  onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                  placeholder="45"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Gender</label>
                <select
                  value={form.patientGender}
                  onChange={(e) => setForm({ ...form, patientGender: e.target.value as any })}
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Linked Invoice #</label>
              <input
                type="text"
                value={form.saleId}
                onChange={(e) => setForm({ ...form, saleId: e.target.value })}
                placeholder="INV-000014"
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Clinical Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Diagnosis or notes..."
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} type="button" className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Capture Prescription'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Controlled Drug Entry Modal ──────────────────────────────────────────────
const ControlledDrugModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}> = ({ onClose, onSubmit, isLoading }) => {
  const [form, setForm] = useState({
    productId: 'prod-cd-1',
    productName: 'Codeine Phosphate 30mg',
    genericName: 'Codeine Phosphate',
    batchNumber: 'BTH-CD-001',
    drugClass: 'NARCOTIC',
    movementType: 'OUTFLOW' as 'INFLOW' | 'OUTFLOW',
    quantitySmallestUnits: '',
    balanceAfterSmallestUnits: '',
    patientName: '',
    patientCnic: '',
    doctorName: '',
    doctorRegNo: '',
    prescriptionRef: '',
    invoiceNumber: '',
    dispensedByName: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(form.quantitySmallestUnits, 10);
    const bal = parseInt(form.balanceAfterSmallestUnits, 10);
    if (!qty || isNaN(bal)) return;

    onSubmit({
      ...form,
      quantitySmallestUnits: qty,
      balanceAfterSmallestUnits: bal,
      patientName: form.patientName || undefined,
      patientCnic: form.patientCnic || undefined,
      doctorName: form.doctorName || undefined,
      doctorRegNo: form.doctorRegNo || undefined,
      prescriptionRef: form.prescriptionRef || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      dispensedByName: form.dispensedByName || 'Dr. Sarah (Pharmacist)',
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="p-5 border-b border-pharma-surface flex items-center justify-between">
          <h3 className="text-sm font-bold text-pharma-text flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pharma-primary" />
            Record Controlled Drug Register Entry
          </h3>
          <button onClick={onClose} className="text-pharma-muted hover:text-pharma-text">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">Medicine Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Product Name *</label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="e.g. Codeine Phosphate 30mg"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Generic Salt *</label>
                <input
                  type="text"
                  value={form.genericName}
                  onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                  placeholder="e.g. Codeine Phosphate"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Batch # *</label>
                <input
                  type="text"
                  value={form.batchNumber}
                  onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                  placeholder="BTH-CD-001"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Drug Class *</label>
                <select
                  value={form.drugClass}
                  onChange={(e) => setForm({ ...form, drugClass: e.target.value })}
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                >
                  <option value="NARCOTIC">NARCOTIC</option>
                  <option value="PSYCHOTROPIC">PSYCHOTROPIC</option>
                  <option value="CONTROLLED">CONTROLLED</option>
                  <option value="PRECURSOR">PRECURSOR</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Movement *</label>
                <select
                  value={form.movementType}
                  onChange={(e) => setForm({ ...form, movementType: e.target.value as any })}
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                >
                  <option value="OUTFLOW">OUTFLOW (Dispense)</option>
                  <option value="INFLOW">INFLOW (Stock Received)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">Quantities & Balances</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Quantity (Smallest Units) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantitySmallestUnits}
                  onChange={(e) => setForm({ ...form, quantitySmallestUnits: e.target.value })}
                  placeholder="e.g. 10"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Balance After *</label>
                <input
                  type="number"
                  min="0"
                  value={form.balanceAfterSmallestUnits}
                  onChange={(e) => setForm({ ...form, balanceAfterSmallestUnits: e.target.value })}
                  placeholder="e.g. 290"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">Patient & Doctor (Outflow)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Patient Name</label>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  placeholder="Muhammad Arif"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Patient CNIC</label>
                <input
                  type="text"
                  value={form.patientCnic}
                  onChange={(e) => setForm({ ...form, patientCnic: e.target.value })}
                  placeholder="35201-1234567-9"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Doctor Name</label>
                <input
                  type="text"
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  placeholder="Dr. Salman Farooq"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Doctor PMDC Reg #</label>
                <input
                  type="text"
                  value={form.doctorRegNo}
                  onChange={(e) => setForm({ ...form, doctorRegNo: e.target.value })}
                  placeholder="PMDC-12345"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-pharma-muted uppercase tracking-wider mb-2">References & Notes</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Prescription Ref / Rx #</label>
                <input
                  type="text"
                  value={form.prescriptionRef}
                  onChange={(e) => setForm({ ...form, prescriptionRef: e.target.value })}
                  placeholder="RX-20261006-0001"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-pharma-text mb-1 block">Invoice / Bill #</label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  placeholder="INV-000014"
                  className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Dispensed / Verified By</label>
              <input
                type="text"
                value={form.dispensedByName}
                onChange={(e) => setForm({ ...form, dispensedByName: e.target.value })}
                placeholder="Dr. Sarah (Pharmacist)"
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-pharma-text mb-1 block">Notes / Reason</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Audit reconciliation or special dispensing..."
                className="w-full border border-pharma-muted/30 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} type="button" className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Record Register Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CompliancePage: React.FC = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('prescriptions');
  const [showRxModal, setShowRxModal] = useState(false);
  const [showCdrModal, setShowCdrModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  // Prescriptions
  const { data: rxData, isLoading: rxLoading } = useQuery<{ success: boolean; data: PrescriptionDto[] }>({
    queryKey: ['compliance-prescriptions', patientSearch],
    queryFn: () =>
      apiFetch(`/api/accounts/prescriptions${patientSearch ? `?patientName=${encodeURIComponent(patientSearch)}` : ''}`),
    enabled: activeTab === 'prescriptions',
  });

  // Controlled Drug Register
  const { data: cdrData, isLoading: cdrLoading } = useQuery<{
    success: boolean;
    data: ControlledDrugRegisterEntryDto[];
  }>({
    queryKey: ['compliance-cdr'],
    queryFn: () => apiFetch('/api/accounts/controlled-drug-register'),
    enabled: activeTab === 'controlled-drugs',
  });

  // CD Balance
  const { data: balanceData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['compliance-cdr-balance'],
    queryFn: () => apiFetch('/api/accounts/controlled-drug-register/balance'),
    enabled: activeTab === 'controlled-drugs',
  });

  const rxMut = useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/accounts/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-prescriptions'] });
      setShowRxModal(false);
    },
  });

  const cdrMut = useMutation({
    mutationFn: (data: any) =>
      apiFetch('/api/accounts/controlled-drug-register', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-cdr'] });
      qc.invalidateQueries({ queryKey: ['compliance-cdr-balance'] });
      setShowCdrModal(false);
    },
  });

  const prescriptions = rxData?.data || [];
  const cdrEntries = cdrData?.data || [];
  const balances = balanceData?.data || [];

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pharma-text flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-pharma-primary" />
            Controlled Drugs & Prescription Register
          </h1>
          <p className="text-xs text-pharma-muted mt-0.5">
            Statutory register for Schedule H / Narcotic / Psychotropic dispensing — DRAP & FBR compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'prescriptions' && (
            <Button variant="primary" size="sm" id="btn-capture-rx" onClick={() => setShowRxModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Capture Prescription
            </Button>
          )}
          {activeTab === 'controlled-drugs' && (
            <Button variant="primary" size="sm" id="btn-add-cdr-entry" onClick={() => setShowCdrModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Register Entry
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Register
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'prescriptions') {
                exportToCsv('prescription-register', prescriptions.map((rx) => ({
                  Rx_Number: rx.prescriptionNumber,
                  Date: new Date(rx.createdAt).toLocaleString(),
                  Doctor: rx.doctorName,
                  PMDC_Reg: rx.doctorRegNo || '',
                  Hospital: rx.doctorHospital || '',
                  Patient: rx.patientName,
                  CNIC: rx.patientCnic || '',
                  Phone: rx.patientPhone || '',
                  Age: rx.patientAge || '',
                  Gender: rx.patientGender || '',
                  Invoice: rx.saleId || '',
                  Captured_By: rx.capturedByName,
                })));
              } else {
                exportToCsv('controlled-drug-register', cdrEntries.map((e) => ({
                  Date: new Date(e.date).toLocaleString(),
                  Drug: e.productName,
                  Generic: e.genericName,
                  Batch: e.batchNumber,
                  Class: e.drugClass,
                  Movement: e.movementType,
                  Quantity: e.quantitySmallestUnits,
                  Balance: e.balanceAfterSmallestUnits,
                  Patient: e.patientName || '',
                  CNIC: e.patientCnic || '',
                  Doctor: e.doctorName || '',
                  Rx_Ref: e.prescriptionRef || '',
                  Invoice: e.invoiceNumber || '',
                  Dispensed_By: e.dispensedByName,
                })));
              }
            }}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export Register
          </Button>
        </div>
      </div>

      {/* ── Warning Banner ── */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800">Statutory Compliance Register</p>
          <p className="text-xs text-amber-700 mt-0.5">
            All controlled drug dispensing must be recorded with a valid prescription. This register is subject to
            inspection by DRAP Drug Control Officers. Inaccurate records are a criminal offence under the Drugs Act 1976.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1.5 border-b border-pharma-surface">
        {(
          [
            { id: 'prescriptions' as ComplianceTab, label: 'Prescription Register', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'controlled-drugs' as ComplianceTab, label: 'Controlled Drug Register', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            id={`tab-compliance-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${activeTab === tab.id
                ? 'bg-pharma-primary text-white shadow-sm'
                : 'text-pharma-muted hover:bg-pharma-surface'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: PRESCRIPTIONS ══════════════════════════════════════════════ */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pharma-muted" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full pl-9 pr-4 py-2 border border-pharma-muted/30 rounded-xl text-xs focus:ring-1 focus:ring-pharma-primary outline-none"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="pharma-card p-4">
              <p className="text-xs text-pharma-muted font-medium">Total Prescriptions</p>
              <p className="text-2xl font-bold text-pharma-text">{prescriptions.length}</p>
              <p className="text-[10px] text-pharma-muted">This period</p>
            </div>
            <div className="pharma-card p-4">
              <p className="text-xs text-pharma-muted font-medium">Linked to Invoices</p>
              <p className="text-2xl font-bold text-pharma-primary">
                {prescriptions.filter((rx) => rx.saleId).length}
              </p>
              <p className="text-[10px] text-pharma-muted">With sale reference</p>
            </div>
            <div className="pharma-card p-4">
              <p className="text-xs text-pharma-muted font-medium">Unlinked (Walk-in)</p>
              <p className="text-2xl font-bold text-amber-600">
                {prescriptions.filter((rx) => !rx.saleId).length}
              </p>
              <p className="text-[10px] text-pharma-muted">No invoice reference</p>
            </div>
          </div>

          {/* Table */}
          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Prescription Capture Log</span>
              <span className="text-xs text-pharma-muted">{prescriptions.length} records</span>
            </div>
            {rxLoading ? (
              <div className="p-12 text-center text-pharma-muted text-xs">Loading prescriptions…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Rx #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Doctor</th>
                      <th className="py-2.5 px-4">Patient</th>
                      <th className="py-2.5 px-4">CNIC</th>
                      <th className="py-2.5 px-4 text-center">Age / Gender</th>
                      <th className="py-2.5 px-4">Linked Invoice</th>
                      <th className="py-2.5 px-4">Captured By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-surface">
                    {prescriptions.map((rx) => (
                      <tr key={rx.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4 font-mono font-bold text-pharma-primary">{rx.prescriptionNumber}</td>
                        <td className="py-2.5 px-4 text-pharma-muted">{formatDateDDMMYYYY(rx.createdAt)}</td>
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-pharma-text">{rx.doctorName}</p>
                          {rx.doctorRegNo && <p className="text-[10px] text-pharma-muted">{rx.doctorRegNo}</p>}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-pharma-text">{rx.patientName}</p>
                          {rx.patientPhone && <p className="text-[10px] text-pharma-muted">{rx.patientPhone}</p>}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-pharma-muted">{rx.patientCnic || '—'}</td>
                        <td className="py-2.5 px-4 text-center">
                          {rx.patientAge ? `${rx.patientAge}y` : '—'} {rx.patientGender ? `/ ${rx.patientGender[0]}` : ''}
                        </td>
                        <td className="py-2.5 px-4">
                          {rx.saleId ? (
                            <span className="font-mono font-bold text-pharma-primary">{rx.saleId}</span>
                          ) : (
                            <Badge variant="quarantine">No Invoice</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-pharma-muted">{rx.capturedByName}</td>
                      </tr>
                    ))}
                    {prescriptions.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-pharma-muted">
                          No prescriptions recorded. Click "Capture Prescription" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: CONTROLLED DRUG REGISTER ═══════════════════════════════════ */}
      {activeTab === 'controlled-drugs' && (
        <div className="space-y-4">
          {/* Current Balance Cards */}
          {balances.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-pharma-text mb-2">Current Controlled Drug Balances</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {balances.map((b: any) => (
                  <div key={b.productId} className="pharma-card p-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${DRUG_CLASS_COLORS[b.drugClass] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {b.drugClass}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${b.matches !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {b.matches !== false ? '✓ Matches Stock' : '⚠️ Variance'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-pharma-text mt-1.5">{b.productName}</p>
                    <p className="text-[10px] text-pharma-muted">{b.genericName}</p>
                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-pharma-surface">
                      <div>
                        <p className="text-lg font-bold text-pharma-primary">{b.balance}</p>
                        <p className="text-[9px] text-pharma-muted">Register Bal</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-pharma-text">{b.inStockQuantity ?? b.balance}</p>
                        <p className="text-[9px] text-pharma-muted">Stock on Hand</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Register Table */}
          <div className="pharma-card overflow-hidden">
            <div className="p-4 border-b border-pharma-surface flex items-center justify-between">
              <span className="text-xs font-bold text-pharma-text">Controlled Drug Movement Register</span>
              <span className="text-xs text-pharma-muted">{cdrEntries.length} entries</span>
            </div>
            {cdrLoading ? (
              <div className="p-12 text-center text-pharma-muted text-xs">Loading register…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-pharma-surface/60 border-b border-pharma-surface text-pharma-text font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Date & Time</th>
                      <th className="py-2.5 px-4">Drug</th>
                      <th className="py-2.5 px-4 text-center">Class</th>
                      <th className="py-2.5 px-4 text-center">Movement</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-center font-bold text-pharma-primary">Balance</th>
                      <th className="py-2.5 px-4">Patient / Doctor</th>
                      <th className="py-2.5 px-4">Rx Ref</th>
                      <th className="py-2.5 px-4">Dispensed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pharma-surface">
                    {cdrEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-pharma-surface/30">
                        <td className="py-2.5 px-4 text-pharma-muted font-mono text-[11px]">
                          {new Date(entry.date).toLocaleString('en-PK')}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-pharma-text">{entry.productName}</p>
                          <p className="text-[10px] text-pharma-muted">{entry.genericName} · {entry.batchNumber}</p>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${DRUG_CLASS_COLORS[entry.drugClass] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {entry.drugClass}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {entry.movementType === 'INFLOW' ? (
                            <span className="flex items-center justify-center gap-1 text-green-700 font-bold">
                              <ArrowDownRight className="w-3 h-3" /> IN
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1 text-red-700 font-bold">
                              <ArrowUpRight className="w-3 h-3" /> OUT
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold font-mono">
                          {entry.movementType === 'INFLOW' ? '+' : '-'}{entry.quantitySmallestUnits}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold font-mono text-pharma-primary">
                          {entry.balanceAfterSmallestUnits}
                        </td>
                        <td className="py-2.5 px-4">
                          {entry.patientName ? (
                            <>
                              <p className="font-medium text-pharma-text">{entry.patientName}</p>
                              {entry.doctorName && <p className="text-[10px] text-pharma-muted">{entry.doctorName}</p>}
                            </>
                          ) : (
                            <span className="text-pharma-muted">— (Stock In)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          {entry.prescriptionRef ? (
                            <span className="text-pharma-primary font-bold">{entry.prescriptionRef}</span>
                          ) : (
                            <span className="text-pharma-muted">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-pharma-muted">{entry.dispensedByName}</td>
                      </tr>
                    ))}
                    {cdrEntries.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-pharma-muted">
                          No controlled drug movements recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showRxModal && (
        <PrescriptionModal
          onClose={() => setShowRxModal(false)}
          onSubmit={(data) => rxMut.mutate(data)}
          isLoading={rxMut.isPending}
        />
      )}
      {showCdrModal && (
        <ControlledDrugModal
          onClose={() => setShowCdrModal(false)}
          onSubmit={(data) => cdrMut.mutate(data)}
          isLoading={cdrMut.isPending}
        />
      )}
    </div>
  );
};
