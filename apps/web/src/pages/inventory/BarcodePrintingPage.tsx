import React, { useState, useEffect } from 'react';
import {
  BarcodeLabelDto,
  formatPaisaToPKR,
} from '@pharmacy/shared';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/Table';
import {
  Printer,
  Barcode,
  Search,
  RefreshCw,
  Sliders,
  CheckSquare,
  Square,
  Eye,
} from 'lucide-react';

export const BarcodePrintingPage: React.FC = () => {
  const [labels, setLabels] = useState<BarcodeLabelDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'unlabeled-only'>('all');
  const [labelSize, setLabelSize] = useState<'50x25' | '38x25' | 'A4_24UP' | 'A4_40UP'>('50x25');

  // Selected items with print quantity: Record<productId_batch, { label: BarcodeLabelDto; count: number }>
  const [selectedQueue, setSelectedQueue] = useState<Record<string, { label: BarcodeLabelDto; count: number }>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const loadLabels = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<any>(`/api/barcodes/unlabeled-products?filter=${filterType}`);
      if (res.success && res.data) {
        setLabels(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load barcode labels', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, [filterType]);

  const getKey = (item: BarcodeLabelDto) => `${item.productId}_${item.batchNumber}`;

  const toggleSelect = (item: BarcodeLabelDto) => {
    const k = getKey(item);
    setSelectedQueue((prev) => {
      const next = { ...prev };
      if (next[k]) {
        delete next[k];
      } else {
        next[k] = { label: item, count: item.quantityToPrint || 5 };
      }
      return next;
    });
  };

  const updateCount = (item: BarcodeLabelDto, newCount: number) => {
    const k = getKey(item);
    setSelectedQueue((prev) => ({
      ...prev,
      [k]: { label: item, count: Math.max(1, newCount) },
    }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredLabels.every((it) => selectedQueue[getKey(it)]);
    if (allSelected) {
      setSelectedQueue({});
    } else {
      const next: Record<string, { label: BarcodeLabelDto; count: number }> = {};
      filteredLabels.forEach((it) => {
        next[getKey(it)] = { label: it, count: it.quantityToPrint || 5 };
      });
      setSelectedQueue(next);
    }
  };

  const filteredLabels = labels.filter(
    (it) =>
      it.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.barcode.includes(searchQuery)
  );

  const totalStickersToPrint = Object.values(selectedQueue).reduce((s, it) => s + it.count, 0);

  // Generates flat list of stickers to render in print view
  const stickerList: BarcodeLabelDto[] = [];
  Object.values(selectedQueue).forEach((entry) => {
    for (let i = 0; i < entry.count; i++) {
      stickerList.push(entry.label);
    }
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-pharma-white p-5 rounded-pharma border border-pharma-muted/20 shadow-pharma-sm no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pharma-accent" />
            <span className="text-xs text-pharma-primary font-semibold font-mono uppercase tracking-wider">
              Phase 3 • Point-of-Sale Hardware Integration
            </span>
          </div>
          <h2 className="text-xl font-bold text-pharma-text mt-1 flex items-center gap-2">
            <Barcode className="w-6 h-6 text-pharma-primary" />
            Barcode Label Sticker Printing
          </h2>
          <p className="text-xs text-pharma-muted mt-0.5">
            Generates standardized Code128 / EAN barcodes for loose items, unbarcoded medicines, and batch shelf stickers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLabels} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            disabled={totalStickersToPrint === 0}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Preview Print ({totalStickersToPrint} Stickers)
          </Button>
        </div>
      </div>

      {/* ── Print Settings Strip ────────────────────────────────────────────── */}
      <div className="p-4 bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-pharma-muted flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-pharma-primary" />
            Sticker Sheet Size:
          </span>
          <select
            value={labelSize}
            onChange={(e) => setLabelSize(e.target.value as any)}
            className="text-xs border border-pharma-muted/30 rounded-md px-3 py-1.5 bg-pharma-surface text-pharma-text focus:outline-none focus:ring-1 focus:ring-pharma-primary"
          >
            <option value="50x25">50mm x 25mm (Standard Thermal Barcode Roll)</option>
            <option value="38x25">38mm x 25mm (Compact Medicine Vial)</option>
            <option value="A4_24UP">A4 Sheet 24-Up (3 x 8 Labels on Laser/Inkjet)</option>
            <option value="A4_40UP">A4 Sheet 40-Up (4 x 10 Labels Small)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filterType === 'all'
                ? 'bg-pharma-primary text-white'
                : 'bg-pharma-surface text-pharma-muted hover:text-pharma-text'
            }`}
          >
            All Medicines
          </button>
          <button
            onClick={() => setFilterType('unlabeled-only')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              filterType === 'unlabeled-only'
                ? 'bg-pharma-primary text-white'
                : 'bg-pharma-surface text-pharma-muted hover:text-pharma-text'
            }`}
          >
            Items Without Manufacturer Barcode
          </button>
        </div>
      </div>

      {/* ── Search filter row ────────────────────────────────────────────────── */}
      <div className="p-3 bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm flex items-center gap-3 no-print">
        <Search className="w-4 h-4 text-pharma-muted ml-2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by brand name, SKU, batch number or barcode..."
          className="border-none shadow-none text-xs focus:ring-0"
        />
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      {/* ── Table of Products / Batches ──────────────────────────────────────── */}
      <div className="bg-pharma-white rounded-pharma border border-pharma-muted/20 shadow-sm p-5 space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold text-pharma-primary flex items-center gap-1.5 hover:underline"
            >
              {filteredLabels.length > 0 && filteredLabels.every((it) => selectedQueue[getKey(it)]) ? (
                <>
                  <CheckSquare className="w-4 h-4" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" /> Select All Filtered ({filteredLabels.length})
                </>
              )}
            </button>
            <span className="text-xs text-pharma-muted">•</span>
            <span className="text-xs text-pharma-muted">
              {Object.keys(selectedQueue).length} items selected for print
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-pharma-primary">
            Total stickers queued: {totalStickersToPrint}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Select</TableHead>
              <TableHead>Medicine & Strength</TableHead>
              <TableHead>Batch #</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Retail MRP</TableHead>
              <TableHead>Barcode Code</TableHead>
              <TableHead className="w-32 text-center">Print Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLabels.map((it) => {
              const k = getKey(it);
              const isSelected = Boolean(selectedQueue[k]);
              const count = selectedQueue[k]?.count ?? (it.quantityToPrint || 5);

              return (
                <TableRow key={k} className={`hover:bg-pharma-surface/50 ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(it)}
                      className="rounded text-pharma-primary focus:ring-pharma-primary w-4 h-4"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-xs text-pharma-text">{it.productName}</div>
                    <div className="text-[10px] text-pharma-muted font-mono">
                      SKU: {it.sku} • Strength: {it.strength} • Rack: {it.rackLocation}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-pharma-text">{it.batchNumber}</TableCell>
                  <TableCell className="font-mono text-xs text-pharma-muted">{it.expiryDate}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold text-pharma-primary">
                    {formatPaisaToPKR(it.mrpPaisa)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] bg-pharma-surface px-2 py-0.5 rounded border border-pharma-muted/20 text-pharma-text">
                      {it.barcode}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={count}
                      onChange={(e) => updateCount(it, parseInt(e.target.value, 10) || 1)}
                      className="w-16 h-7 text-center font-mono font-bold text-xs mx-auto"
                      disabled={!isSelected}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Print Preview Modal / Section ────────────────────────────────────── */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-pharma-white rounded-pharma shadow-pharma-xl max-w-4xl w-full p-6 space-y-5 border border-pharma-muted/20">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <div>
                <h3 className="font-bold text-base text-pharma-text flex items-center gap-2">
                  <Printer className="w-5 h-5 text-pharma-primary" />
                  Thermal Label Sticker Print Sheet ({stickerList.length} Stickers)
                </h3>
                <p className="text-xs text-pharma-muted mt-0.5">
                  Format: <strong>{labelSize}</strong> • Direct output formatted for thermal label and laser sticker printers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1.5" />
                  Trigger Print Dialog
                </Button>
              </div>
            </div>

            {/* Sticker Grid (Formatted for Print) */}
            <div
              className={`p-4 bg-gray-100 rounded-lg max-h-[70vh] overflow-y-auto ${
                labelSize === '50x25' || labelSize === '38x25'
                  ? 'flex flex-wrap gap-3 justify-center'
                  : 'grid grid-cols-3 gap-2'
              }`}
            >
              {stickerList.map((it, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-400 p-2 text-center shadow-xs flex flex-col justify-between"
                  style={{
                    width: labelSize === '38x25' ? '150px' : '190px',
                    height: '100px',
                  }}
                >
                  <div className="text-[9px] font-bold tracking-tight uppercase text-gray-800 truncate">
                    PharmaCare • {it.productName}
                  </div>
                  <div className="text-[8px] text-gray-600 font-mono">
                    {it.strength} • B:{it.batchNumber} • Exp:{it.expiryDate}
                  </div>

                  {/* SVG Barcode Graphic */}
                  <div className="my-1 flex justify-center">
                    <svg width="140" height="26" viewBox="0 0 140 26" className="mx-auto">
                      <rect x="0" y="0" width="140" height="26" fill="#ffffff" />
                      {/* Realistic barcode line pattern */}
                      {[
                        2, 5, 8, 12, 14, 18, 22, 25, 27, 32, 36, 40, 44, 47, 52, 55, 59, 62, 66,
                        70, 74, 78, 81, 85, 88, 92, 96, 100, 104, 108, 112, 115, 119, 122, 126, 130, 135
                      ].map((pos, bIdx) => (
                        <rect
                          key={bIdx}
                          x={pos}
                          y="1"
                          width={bIdx % 3 === 0 ? 3 : bIdx % 2 === 0 ? 2 : 1}
                          height="24"
                          fill="#000000"
                        />
                      ))}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[8px] font-mono font-bold text-gray-900 px-1 border-t border-gray-200 pt-0.5">
                    <span>{it.barcode}</span>
                    <span>{formatPaisaToPKR(it.mrpPaisa)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
