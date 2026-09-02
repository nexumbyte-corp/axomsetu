import { backupService } from '../src/services/backup.service.js';

async function run() {
  console.log(' Starting School ERP Database Backup Job...');
  try {
    const result = await backupService.runDatabaseBackup();
    console.log(' Database Backup Completed Successfully!');
    console.log(` File: ${result.fileName}`);
    console.log(` Size: ${result.sizeMb}`);
    console.log(` Path: ${result.filePath}`);
    process.exit(0);
  } catch (error) {
    console.error(' Database Backup Failed:', error.message);
    process.exit(1);
  }
}

run();
