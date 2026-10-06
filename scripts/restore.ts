import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreBackup(backupFilePath: string) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file not found at: ${backupFilePath}`);
  }

  console.log(`🔄 Reading backup file: ${backupFilePath}...`);
  const content = fs.readFileSync(backupFilePath, 'utf-8');
  const snapshot = JSON.parse(content);

  if (!snapshot.tables || !snapshot.version) {
    throw new Error('Invalid backup file format: missing tables or version.');
  }

  console.log(`⚠️  Restoring database from snapshot taken at ${snapshot.timestamp}...`);

  // Execute in foreign-key dependency order
  await prisma.$transaction(async (tx) => {
    // 1. System settings & Users
    if (snapshot.tables.systemSettings) {
      for (const row of snapshot.tables.systemSettings) {
        await tx.systemSetting.upsert({
          where: { key: row.key },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.users) {
      for (const row of snapshot.tables.users) {
        await tx.user.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    // 2. Categories & Companies & Suppliers
    if (snapshot.tables.categories) {
      for (const row of snapshot.tables.categories) {
        await tx.category.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.companies) {
      for (const row of snapshot.tables.companies) {
        await tx.company.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.suppliers) {
      for (const row of snapshot.tables.suppliers) {
        await tx.supplier.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    // 3. Products
    if (snapshot.tables.products) {
      for (const row of snapshot.tables.products) {
        await tx.product.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    // 4. Batches & Stock
    if (snapshot.tables.stockBatches) {
      for (const row of snapshot.tables.stockBatches) {
        await tx.stockBatch.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    // 5. Sales & SaleItems
    if (snapshot.tables.sales) {
      for (const row of snapshot.tables.sales) {
        await tx.sale.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.saleItems) {
      for (const row of snapshot.tables.saleItems) {
        await tx.saleItem.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.payments) {
      for (const row of snapshot.tables.payments) {
        await tx.payment.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    // 6. Returns
    if (snapshot.tables.saleReturns) {
      for (const row of snapshot.tables.saleReturns) {
        await tx.saleReturn.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }

    if (snapshot.tables.saleReturnItems) {
      for (const row of snapshot.tables.saleReturnItems) {
        await tx.saleReturnItem.upsert({
          where: { id: row.id },
          update: row,
          create: row,
        });
      }
    }
  });

  console.log(`✅ Database successfully restored from snapshot!`);
  await prisma.$disconnect();
}

const targetFile = process.argv[2];
if (targetFile) {
  restoreBackup(targetFile).catch((e) => {
    console.error('❌ Restore failed:', e);
    process.exit(1);
  });
}

export { restoreBackup };
