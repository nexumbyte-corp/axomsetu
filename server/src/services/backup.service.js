import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

const execPromise = promisify(exec);

export const backupService = {
  /**
   * Execute automated database backup using pg_dump (or Prisma JSON dump fallback).
   * Compresses the output archive, checks file integrity, and rotates old backups.
   */
  async runDatabaseBackup(actorUserId = null) {
    const backupBaseDir = path.resolve(env.BACKUP_DIR || './backups');
    const dbBackupDir = path.join(backupBaseDir, 'database');

    if (!fs.existsSync(dbBackupDir)) {
      fs.mkdirSync(dbBackupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let targetArchive = '';

    try {
      const dbUrl = new URL(env.DATABASE_URL);
      const host = dbUrl.hostname || 'localhost';
      const port = dbUrl.port || '5432';
      const user = dbUrl.username || 'postgres';
      const password = dbUrl.password || '';
      const database = dbUrl.pathname.substring(1) || 'school_saas';

      const backupFileName = `axomsetu_db_${timestamp}.sql`;
      const gzipFileName = `${backupFileName}.gz`;
      const sqlFilePath = path.join(dbBackupDir, backupFileName);
      const gzipFilePath = path.join(dbBackupDir, gzipFileName);

      // Attempt native pg_dump
      try {
        const pgDumpCmd = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${sqlFilePath}"`;
        const envVars = { ...process.env, PGPASSWORD: password };
        await execPromise(pgDumpCmd, { env: envVars });

        if (process.platform === 'win32') {
          await execPromise(`powershell -Command "Compress-Archive -Path '${sqlFilePath}' -DestinationPath '${gzipFilePath}' -Force"`);
          if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);
          targetArchive = gzipFilePath;
        } else {
          await execPromise(`gzip -f "${sqlFilePath}"`);
          targetArchive = `${sqlFilePath}.gz`;
        }
      } catch (pgDumpErr) {
        // Fallback: Programmatic Prisma export if pg_dump binary is missing
        console.warn('[Backup Notice]: pg_dump binary not found in PATH, using Prisma JSON backup engine fallback.');
        const jsonFileName = `axomsetu_db_${timestamp}.json.gz`;
        targetArchive = path.join(dbBackupDir, jsonFileName);

        const tables = [
          'user', 'school', 'schoolAdmin', 'schoolUserPermission', 'userSession',
          'academicYear', 'class', 'section', 'medium', 'stream',
          'student', 'studentEnrollment', 'feeType', 'feeStructure',
          'studentFeeCharge', 'feePayment', 'paymentAllocation', 'expense',
          'fundTransaction', 'financialTransaction', 'auditLog', 'staff',
        ];

        const dbExport = {};
        for (const table of tables) {
          if (prisma[table]) {
            dbExport[table] = await prisma[table].findMany();
          }
        }

        const jsonBuffer = Buffer.from(JSON.stringify(dbExport, null, 2), 'utf-8');
        const compressedBuffer = zlib.gzipSync(jsonBuffer);
        fs.writeFileSync(targetArchive, compressedBuffer);
      }

      // Verify backup file exists and has non-zero size
      const stats = fs.statSync(targetArchive);
      if (stats.size === 0) {
        throw new Error('Generated backup file is 0 bytes (empty)');
      }

      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

      // Rotate old database backups according to retention policy
      this.rotateBackups(dbBackupDir, env.BACKUP_RETENTION_DAYS || 7);

      // Trigger Offsite Sync if REMOTE_BACKUP_COMMAND is set (e.g. AWS S3, Cloudflare R2, SCP, Rclone)
      if (env.REMOTE_BACKUP_COMMAND) {
        await this.syncBackupOffsite(targetArchive);
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: actorUserId || null,
          action: 'DATABASE_BACKUP_SUCCESS',
          entityType: 'SystemBackup',
          entityId: path.basename(targetArchive),
          newValues: {
            fileName: path.basename(targetArchive),
            sizeMb: `${sizeMb} MB`,
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(() => {});

      return {
        success: true,
        fileName: path.basename(targetArchive),
        filePath: targetArchive,
        sizeMb: `${sizeMb} MB`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[Backup Error]: Database backup failed:', error.message);

      await prisma.auditLog.create({
        data: {
          userId: actorUserId || null,
          action: 'DATABASE_BACKUP_FAILED',
          entityType: 'SystemBackup',
          entityId: 'FAILED',
          newValues: { error: error.message },
        },
      }).catch(() => {});

      throw new Error(`Database backup failed: ${error.message}`);
    }
  },

  /**
   * Rotate backup files older than retention days.
   * @param {string} dirPath
   * @param {number} retentionDays
   */
  rotateBackups(dirPath, retentionDays = 7) {
    try {
      if (!fs.existsSync(dirPath)) return;
      const files = fs.readdirSync(dirPath);
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile() && stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          console.log(`[Backup Rotation]: Removed old backup file: ${file}`);
        }
      }
    } catch (err) {
      console.error('[Backup Rotation Error]:', err.message);
    }
  },

  /**
   * Sync generated backup file off-site to external cloud storage or remote server.
   * @param {string} filePath
   */
  async syncBackupOffsite(filePath) {
    try {
      const rawCmd = env.REMOTE_BACKUP_COMMAND;
      if (!rawCmd) return;

      const formattedCmd = rawCmd.replace('{file}', `"${filePath}"`).replace('{filename}', `"${path.basename(filePath)}"`);
      console.log(`[Offsite Backup Sync]: Executing command: ${formattedCmd}`);

      await execPromise(formattedCmd);
      console.log(`[Offsite Backup Sync]: Successfully uploaded backup off-site: ${path.basename(filePath)}`);
    } catch (err) {
      console.error('[Offsite Backup Sync Error]: Failed to upload backup offsite:', err.message);
    }
  },

  /**
   * Get backup status and list existing backups.
   */
  async getBackupStatus() {
    const backupBaseDir = path.resolve(env.BACKUP_DIR || './backups');
    const dbBackupDir = path.join(backupBaseDir, 'database');

    let files = [];
    if (fs.existsSync(dbBackupDir)) {
      files = fs.readdirSync(dbBackupDir).map((fileName) => {
        const filePath = path.join(dbBackupDir, fileName);
        const stats = fs.statSync(filePath);
        return {
          fileName,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.mtime,
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
    }

    return {
      backupDirectory: dbBackupDir,
      totalBackups: files.length,
      latestBackup: files[0] || null,
      backups: files,
    };
  },
};
