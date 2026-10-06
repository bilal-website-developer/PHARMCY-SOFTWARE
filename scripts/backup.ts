import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, `pharmacy_backup_${timestamp}.json`);
  console.log(`📦 Starting automated database backup at ${new Date().toISOString()}...`);

  try {
    // Collect all table data in consistent order
    const snapshot = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metadata: {
        system: 'PharmaCare Pharmacy Management ERP',
        dbEngine: 'PostgreSQL',
      },
      tables: {
        users: await prisma.user.findMany(),
        categories: await prisma.category.findMany(),
        companies: await prisma.company.findMany(),
        suppliers: await prisma.supplier.findMany(),
        products: await prisma.product.findMany(),
        productUnits: await prisma.productUnit.findMany(),
        productBarcodes: await prisma.productBarcode.findMany(),
        purchases: await prisma.purchase.findMany(),
        purchaseItems: await prisma.purchaseItem.findMany(),
        stockBatches: await prisma.stockBatch.findMany(),
        stockMovements: await prisma.stockMovement.findMany(),
        stockAdjustments: await prisma.stockAdjustment.findMany(),
        priceHistory: await prisma.priceHistory.findMany(),
        sales: await prisma.sale.findMany(),
        saleItems: await prisma.saleItem.findMany(),
        payments: await prisma.payment.findMany(),
        heldBills: await prisma.heldBill.findMany(),
        saleReturns: await prisma.saleReturn.findMany(),
        saleReturnItems: await prisma.saleReturnItem.findMany(),
        systemSettings: await prisma.systemSetting.findMany(),
        auditLogs: await prisma.auditLog.findMany(),
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    const stats = fs.statSync(backupFilePath);

    console.log(`✅ Backup successfully saved to: ${backupFilePath}`);
    console.log(`📊 Snapshot size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📋 Table statistics:`);
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      console.log(`   - ${table.padEnd(20)}: ${(rows as any[]).length} rows`);
    }

    // Prune backups older than 30 days
    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith('pharmacy_backup_') && f.endsWith('.json'));
    if (files.length > 30) {
      files.sort();
      const toDelete = files.slice(0, files.length - 30);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`🧹 Pruned old backup: ${file}`);
      }
    }

    return backupFilePath;
  } catch (error: any) {
    if (error?.message?.includes('Can\'t reach database server')) {
      console.warn('⚠️  Notice: Local PostgreSQL at localhost:5432 is offline.');
      console.warn('💡 To start the local PostgreSQL database with Docker, run:');
      console.warn('   npm run docker:db:up');
    } else {
      console.error('❌ Database backup failed:', error);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup.ts')) {
  createBackup().catch(() => process.exit(1));
}

export { createBackup };
