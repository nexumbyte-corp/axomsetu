import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    name: 'Free Trial',
    code: 'TRIAL',
    type: 'TRIAL',
    durationValue: 1,
    durationUnit: 'MONTH',
    basePrice: 0,
    discountPercentage: 100,
    discountAmount: 0,
    finalPrice: 0,
    currency: 'INR',
    description: '1-Month full platform free trial for newly registered schools.',
    offerTitle: '1 Month Free',
    offerDescription: 'Try AxomSetu completely free with full access for 1 month.',
    badge: 'FREE TRIAL',
    isTrial: true,
    isActive: true,
    displayOrder: 0,
    features: [
      'All Modules Activated',
      'Student Management',
      'Staff Management',
      'Attendance Management',
      'Academic Management',
      'Fee Management',
      'Hostel Management',
      'Payroll Management',
      'Finance & Ledger',
      'Reports & Analytics',
      'PDF Documents Generator',
      'Technical Support',
    ],
  },
  {
    name: 'Monthly',
    code: 'MONTHLY',
    type: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTH',
    basePrice: 1200,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 1200,
    currency: 'INR',
    description: 'Flexible monthly subscription with complete feature access.',
    offerTitle: 'Flexible Monthly Plan',
    offerDescription: 'Pay month-to-month with full feature access for 30 days.',
    badge: null,
    isTrial: false,
    isActive: true,
    displayOrder: 1,
    features: [
      'All Modules Activated',
      'Student Management',
      'Staff Management',
      'Attendance Management',
      'Academic Management',
      'Fee Management',
      'Hostel Management',
      'Payroll Management',
      'Finance & Ledger',
      'Reports & Analytics',
      'PDF Documents Generator',
      'Technical Support',
    ],
  },
  {
    name: 'Quarterly',
    code: 'QUARTERLY',
    type: 'QUARTERLY',
    durationValue: 3,
    durationUnit: 'MONTH',
    basePrice: 3600,
    discountPercentage: 10,
    discountAmount: 360,
    finalPrice: 3240,
    currency: 'INR',
    description: 'Quarterly subscription plan offering 10% instant discount.',
    offerTitle: 'Save ₹360',
    offerDescription: '10% OFF on quarterly billing (90 days access).',
    badge: 'POPULAR',
    isTrial: false,
    isActive: true,
    displayOrder: 2,
    features: [
      'All Modules Activated',
      'Student Management',
      'Staff Management',
      'Attendance Management',
      'Academic Management',
      'Fee Management',
      'Hostel Management',
      'Payroll Management',
      'Finance & Ledger',
      'Reports & Analytics',
      'PDF Documents Generator',
      'Technical Support',
    ],
  },
  {
    name: 'Yearly',
    code: 'YEARLY',
    type: 'YEARLY',
    durationValue: 1,
    durationUnit: 'YEAR',
    basePrice: 14400,
    discountPercentage: 15,
    discountAmount: 2160,
    finalPrice: 12240,
    currency: 'INR',
    description: 'Annual subscription offering maximum savings and priority support.',
    offerTitle: 'Save ₹2,160',
    offerDescription: '15% OFF on yearly billing (365 days access).',
    badge: 'BEST VALUE',
    isTrial: false,
    isActive: true,
    displayOrder: 3,
    features: [
      'All Modules Activated',
      'Student Management',
      'Staff Management',
      'Attendance Management',
      'Academic Management',
      'Fee Management',
      'Hostel Management',
      'Payroll Management',
      'Finance & Ledger',
      'Reports & Analytics',
      'PDF Documents Generator',
      'Technical Support',
    ],
  },
];

async function main() {
  console.log('Starting database seed...');

  const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@schoolsaas.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'SuperAdminPass123!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  // 1. Seed Super Admin User
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: adminName,
      role: Role.SUPER_ADMIN,
    },
    create: {
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`Super Admin created: ${superAdmin.email}`);

  // 2. Seed Default Subscription Plans
  console.log('Seeding subscription plans...');
  for (const plan of DEFAULT_PLANS) {
    const upsertedPlan = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`Subscription plan ready: ${upsertedPlan.name} (${upsertedPlan.code}) - Final Price: ₹${upsertedPlan.finalPrice}`);
  }

  console.log('Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
