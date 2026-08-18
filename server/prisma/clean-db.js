import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('Starting database cleanup: Permanently deleting all data...');

  try {
    // Fetch all table names in public schema (excluding migration history and platform contact/settings tables)
    const tablenames = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
        AND tablename NOT IN (
          '_prisma_migrations',
          'platform_contacts',
          'platform_contact',
          'contacts',
          'contact_messages',
          'platform_settings'
        );
    `;

    if (!tablenames || tablenames.length === 0) {
      console.log('No tables found to clean.');
      return;
    }

    console.log(`Found ${tablenames.length} tables to truncate.`);

    // Truncate each table using CASCADE to remove foreign key dependencies
    for (const { tablename } of tablenames) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        console.log(`  └─ Table "${tablename}" truncated successfully.`);
      } catch (tableErr) {
        console.error(`  └─ Failed to truncate table "${tablename}":`, tableErr.message);
      }
    }

    console.log('\nALL DATABASE TABLES HAVE BEEN PERMANENTLY CLEARED SUCCESSFULLY.');

    // Check if --seed flag was passed to automatically re-seed initial setup
    const shouldSeed = process.argv.includes('--seed');
    if (shouldSeed) {
      console.log('\nAuto-seeding initial system setup (Super Admin & Subscription Plans)...');
      const _seedModule = await import('./seed.js');
      // seed.js runs automatically on import or function call if exported
    }

  } catch (err) {
    console.error('Critical error during database cleanup:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
