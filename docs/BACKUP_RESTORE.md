# PharmaCare ERP: Automated Backup & Disaster Recovery Guide

## 1. Overview
The PharmaCare Pharmacy Management System maintains transactional database consistency across Postgres and Prisma. To protect business and clinical data against hardware failure, operator mistakes, or system loss, daily automated database backups and verified restore procedures are provided.

---

## 2. On-Demand Backup Execution

To run an immediate database backup snapshot:

```bash
# Run from repository root
npm run backup
```

### What Happens:
1. Gathers all operational tables in topological foreign-key order:
   - Users & roles
   - System settings (expiry warning threshold, role discount caps, receipt headers)
   - Categories, companies & suppliers
   - Medicine catalog, unit conversions & barcodes
   - Purchases, GRN bills & supplier ledger entries
   - Stock batches, movements & adjustments
   - Sales, items, payments & held bills
   - Sales returns & returned items
   - Immutable audit logs
2. Writes a timestamped JSON snapshot to `/backups/pharmacy_backup_YYYY-MM-DDTHH-mm-ss.json`.
3. Displays total size and row counts for each table.
4. Automatically retains the most recent 30 daily backup snapshots, purging older snapshots.

---

## 3. Automated Daily Backup (Cron / Task Scheduler)

### Linux / macOS (crontab):
Run every midnight at 02:00 AM:
```bash
0 2 * * * cd /path/to/pharmacy-erp && /usr/bin/npm run backup >> /var/log/pharmacy_backup.log 2>&1
```

### Windows (PowerShell Scheduled Task):
Create a Windows scheduled task running at 02:00 AM daily:
```powershell
$action = New-ScheduledTaskAction -Execute "npm.cmd" -Argument "run backup" -WorkingDirectory "e:\PHARMCY WEBSITE MANAGMENT"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "PharmaCareDailyBackup" -Description "Daily PharmaCare Database Snapshot"
```

---

## 4. Disaster Recovery / Restore Procedure

To restore a fresh or replacement database from any snapshot file:

```bash
# Syntax:
npm run restore -- ./backups/pharmacy_backup_YYYY-MM-DDTHH-mm-ss.json
```

### Step-by-Step Restoration Verification:
1. Ensure the PostgreSQL database service is running and `DATABASE_URL` is set in `apps/api/.env`.
2. Apply the latest schema definitions:
   ```bash
   npx prisma migrate deploy
   ```
3. Run the restore command specifying the desired backup file.
4. Verify record counts and check that latest invoice counter and batch stock balances are consistent.
5. Log into the web application to confirm catalog, sales, returns, and settings are online.
