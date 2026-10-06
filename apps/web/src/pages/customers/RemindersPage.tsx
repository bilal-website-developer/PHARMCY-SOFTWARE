import React, { useState, useEffect } from 'react';
import {
  CreditReminderItemDto,
  RefillReminderItemDto,
  ReminderLogDto,
  formatPaisaToPKR,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/Table';
import {
  MessageSquare,
  Share2,
  RefreshCw,
  Search,
  History,
  Copy,
  Pill,
} from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'credit' | 'refills' | 'logs'>('credit');
  const [creditItems, setCreditItems] = useState<CreditReminderItemDto[]>([]);
  const [refillItems, setRefillItems] = useState<RefillReminderItemDto[]>([]);
  const [logs, setLogs] = useState<ReminderLogDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal for editing message before sending
  const [modalItem, setModalItem] = useState<{
    recipientName: string;
    phone: string;
    messageText: string;
    reminderType: 'CREDIT' | 'REFILL';
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, rRes, lRes] = await Promise.all([
        apiFetch<any>('/api/reminders/credit'),
        apiFetch<any>('/api/reminders/refills'),
        apiFetch<any>('/api/reminders/logs'),
      ]);
      if (cRes.success) setCreditItems(cRes.data);
      if (rRes.success) setRefillItems(rRes.data);
      if (lRes.success) setLogs(lRes.data);
    } catch (err: any) {
      console.error('Failed to load reminders data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendWhatsApp = async (recipientName: string, phone: string, text: string, type: 'CREDIT' | 'REFILL') => {
    // 1. Log to server
    try {
      await apiFetch<any>('/api/reminders/log', {
        method: 'POST',
        body: JSON.stringify({
          recipientName,
          recipientPhone: phone,
          reminderType: type,
          channel: 'WHATSAPP',
          messageText: text,
        }),
      });
      loadData();
    } catch {
      // ignore
    }

    // 2. Open WhatsApp link or copy
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = async (recipientName: string, phone: string, text: string, type: 'CREDIT' | 'REFILL') => {
    await navigator.clipboard.writeText(text);
    alert('Message copied to clipboard!');
    try {
      await apiFetch<any>('/api/reminders/log', {
        method: 'POST',
        body: JSON.stringify({
          recipientName,
          recipientPhone: phone,
          reminderType: type,
          channel: 'SMS',
          messageText: text,
        }),
      });
      loadData();
    } catch {
      // ignore
    }
  };

  const filteredCredit = creditItems.filter(
    (c) =>
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const filteredRefills = refillItems.filter(
    (r) =>
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pharma-accent" />
            <span className="text-xs text-pharma-primary font-semibold font-mono uppercase tracking-wider">
              Phase 3 • Patient Engagement & Cash Recovery
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text mt-1 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-pharma-primary" />
            WhatsApp & SMS Reminders
          </h2>
          <p className="text-xs text-pharma-muted mt-0.5">
            Automated payment recovery notices for credit customers and proactive prescription refill reminders for chronic patients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-pharma-surface p-1 rounded-lg border border-pharma-muted/30">
            <button
              onClick={() => setActiveTab('credit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'credit'
                  ? 'bg-pharma-primary text-white shadow-xs'
                  : 'text-pharma-muted hover:text-pharma-text'
              }`}
            >
              Credit Recovery ({creditItems.length})
            </button>
            <button
              onClick={() => setActiveTab('refills')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'refills'
                  ? 'bg-pharma-primary text-white shadow-xs'
                  : 'text-pharma-muted hover:text-pharma-text'
              }`}
            >
              Refill Reminders ({refillItems.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                activeTab === 'logs'
                  ? 'bg-pharma-primary text-white shadow-xs'
                  : 'text-pharma-muted hover:text-pharma-text'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({logs.length})
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────────────────── */}
      <div className="p-3 bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-pharma-muted ml-2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by customer name, patient name, phone or medicine..."
          className="border-none shadow-none text-xs focus:ring-0"
        />
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      {/* ── Tab 1: Credit Customer Reminders ─────────────────────────────────── */}
      {activeTab === 'credit' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-pharma-text">
              Overdue Credit Customers ({filteredCredit.length})
            </h3>
            <span className="text-xs text-pharma-muted">Direct 1-click WhatsApp message dispatch</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-center">Overdue Days</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Dispatch Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredit.map((c) => (
                <TableRow key={c.customerId} className="hover:bg-pharma-surface/50">
                  <TableCell className="font-bold text-xs text-pharma-text">{c.customerName}</TableCell>
                  <TableCell className="font-mono text-xs text-pharma-muted">{c.phone}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-xs text-red-600">
                    {formatPaisaToPKR(c.currentBalancePaisa)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      {c.daysOverdue} Days
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-pharma-muted">{c.lastPaymentDate || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setModalItem({
                            recipientName: c.customerName,
                            phone: c.phone,
                            messageText: c.suggestedMessage,
                            reminderType: 'CREDIT',
                          })
                        }
                        className="text-xs h-7"
                      >
                        Preview / Edit
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleSendWhatsApp(c.customerName, c.phone, c.suggestedMessage, 'CREDIT')
                        }
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab 2: Prescription Refill Reminders ─────────────────────────────── */}
      {activeTab === 'refills' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-pharma-text">
              Chronic Care Prescription Refills ({filteredRefills.length})
            </h3>
            <span className="text-xs text-pharma-muted">Predicted from purchase date & pack dosage</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Prescribed Medicine</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead className="text-center">Dosage Cycle</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Dispatch Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRefills.map((r) => (
                <TableRow key={r.id} className="hover:bg-pharma-surface/50">
                  <TableCell>
                    <div className="font-bold text-xs text-pharma-text">{r.patientName}</div>
                    <div className="text-[10px] text-pharma-muted font-mono">{r.phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-xs text-pharma-text flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-pharma-primary" />
                      {r.medicineName}
                    </div>
                    <div className="text-[10px] text-pharma-muted">Dosage: {r.dosageForm}</div>
                  </TableCell>
                  <TableCell className="text-xs text-pharma-muted">{r.doctorName || 'N/A'}</TableCell>
                  <TableCell className="text-center text-xs font-mono">
                    {r.daysSincePurchase} of {r.daysSupply} days elapsed
                  </TableCell>
                  <TableCell className="text-center">
                    {r.isOverdue ? (
                      <Badge variant="expired" dot={true}>
                        OVERDUE ({Math.abs(r.daysUntilRefill)}d)
                      </Badge>
                    ) : (
                      <Badge variant="near-expiry" dot={true}>
                        DUE IN {r.daysUntilRefill} DAYS
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setModalItem({
                            recipientName: r.patientName,
                            phone: r.phone,
                            messageText: r.suggestedMessage,
                            reminderType: 'REFILL',
                          })
                        }
                        className="text-xs h-7"
                      >
                        Preview
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleSendWhatsApp(r.patientName, r.phone, r.suggestedMessage, 'REFILL')
                        }
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab 3: History & Dispatch Logs ───────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-pharma-text">
              Reminder Dispatch Log ({logs.length})
            </h3>
            <span className="text-xs text-pharma-muted">Audit trail of customer notifications</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Channel</TableHead>
                <TableHead>Message Excerpt</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-pharma-surface/50">
                  <TableCell className="text-xs text-pharma-muted font-mono">
                    {new Date(log.sentAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-bold text-xs text-pharma-text">{log.recipientName}</TableCell>
                  <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={log.reminderType === 'CREDIT' ? 'near-expiry' : 'primary'} dot={false}>
                      {log.reminderType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs font-mono text-emerald-700">
                    {log.channel}
                  </TableCell>
                  <TableCell className="text-xs text-pharma-muted max-w-xs truncate">
                    {log.messageText}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="active" dot={true}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Preview / Edit Message Modal ─────────────────────────────────────── */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-lg w-full p-5 space-y-4 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-pharma-text flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pharma-primary" />
                Customize Reminder Message
              </h3>
              <button
                onClick={() => setModalItem(null)}
                className="text-pharma-muted hover:text-pharma-text text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-pharma-muted block mb-1">Recipient & Contact:</label>
                <div className="text-xs font-bold text-pharma-text font-mono">
                  {modalItem.recipientName} ({modalItem.phone})
                </div>
              </div>

              <div>
                <label className="text-xs text-pharma-muted block mb-1">Message Body (Urdu & English):</label>
                <textarea
                  rows={6}
                  value={modalItem.messageText}
                  onChange={(e) =>
                    setModalItem({ ...modalItem, messageText: e.target.value })
                  }
                  className="w-full text-xs p-2.5 rounded-md border border-pharma-muted/30 focus:outline-none focus:ring-1 focus:ring-pharma-primary font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyText(
                    modalItem.recipientName,
                    modalItem.phone,
                    modalItem.messageText,
                    modalItem.reminderType
                  )
                }
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy SMS
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleSendWhatsApp(
                    modalItem.recipientName,
                    modalItem.phone,
                    modalItem.messageText,
                    modalItem.reminderType
                  );
                  setModalItem(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
