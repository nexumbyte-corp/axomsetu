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
    offerTitle: '1 Month Free Trial',
    offerDescription: 'Try AxomSetu completely free with full feature access for 30 days.',
    badge: 'FREE TRIAL',
    maxStudentLimit: 100,
    isTrial: true,
    isEnterprise: false,
    isActive: true,
    displayOrder: 0,
    features: [
      'All Operational Modules Activated',
      'Up to 100 Active Students',
      'Student & Staff Management',
      'Attendance & Academic Management',
      'Fee Collection & Ledger',
      'Hostel Management (Rooms & Fees)',
      'Payroll & Payslips Generator',
      'Finance & Expense Ledger',
      'Reports & Analytics',
      'PDF Receipt & Slip Generator',
      'Technical Support',
    ],
  },
  {
    name: 'Monthly Plan',
    code: 'MONTHLY',
    type: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTH',
    basePrice: 1200,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 1200,
    currency: 'INR',
    description: 'Flexible monthly subscription with complete feature access for up to 300 active students.',
    offerTitle: 'Flexible Monthly Billing',
    offerDescription: 'Pay month-to-month with full feature access for 30 days.',
    badge: null,
    maxStudentLimit: 300,
    isTrial: false,
    isEnterprise: false,
    isActive: true,
    displayOrder: 1,
    features: [
      'All Operational Modules Activated',
      'Up to 300 Active Students',
      'Student & Staff Management',
      'Attendance & Academic Management',
      'Fee Collection & Fee Overrides',
      'Hostel Accommodation & Resident Fees',
      'Payroll Management & Payslips',
      'Finance & Expense Ledger',
      'Reports & PDF Document Export',
      'Standard Technical Support',
    ],
  },
  {
    name: 'Quarterly Growth',
    code: 'QUARTERLY',
    type: 'QUARTERLY',
    durationValue: 3,
    durationUnit: 'MONTH',
    basePrice: 3600,
    discountPercentage: 17,
    discountAmount: 600,
    finalPrice: 3000,
    currency: 'INR',
    description: 'Quarterly growth subscription offering ₹600 instant savings for up to 500 active students.',
    offerTitle: 'Save ₹600 Instant',
    offerDescription: 'Save ₹600 on quarterly billing (90 days total access).',
    badge: 'POPULAR',
    maxStudentLimit: 500,
    isTrial: false,
    isEnterprise: false,
    isActive: true,
    displayOrder: 2,
    features: [
      'All Operational Modules Activated',
      'Up to 500 Active Students',
      'Student & Staff Management',
      'Attendance & Academic Management',
      'Fee Collection & Automated Dues Slips',
      'Hostel Management & Room Beds',
      'Payroll & Monthly Financial Reports',
      'Finance & Expense Ledger',
      'PDF Document & Ledger Export',
      'Priority Technical Support',
    ],
  },
  {
    name: 'Yearly Pro',
    code: 'YEARLY',
    type: 'YEARLY',
    durationValue: 1,
    durationUnit: 'YEAR',
    basePrice: 14400,
    discountPercentage: 25,
    discountAmount: 3600,
    finalPrice: 10800,
    currency: 'INR',
    description: 'Annual subscription offering 25% maximum savings for up to 700 active students.',
    offerTitle: 'Save ₹3,600 (25% OFF)',
    offerDescription: 'Maximum savings with annual billing (365 days full access).',
    badge: 'BEST VALUE',
    maxStudentLimit: 700,
    isTrial: false,
    isEnterprise: false,
    isActive: true,
    displayOrder: 3,
    features: [
      'All Operational Modules Activated',
      'Up to 700 Active Students',
      'Student & Staff Management',
      'Attendance & Academic Management',
      'Fee Collection, Discounts & Overrides',
      'Hostel Management & Resident Transfers',
      'Payroll & Staff Advance Ledger',
      'Full Finance & Accounting Ledger',
      'Executive Analytics & PDF Exports',
      'Priority Helpdesk & Technical Support',
    ],
  },
  {
    name: 'Enterprise Custom',
    code: 'ENTERPRISE',
    type: 'ENTERPRISE',
    durationValue: 1,
    durationUnit: 'YEAR',
    basePrice: 0,
    discountPercentage: 0,
    discountAmount: 0,
    finalPrice: 0,
    currency: 'INR',
    description: 'Dedicated enterprise solution for large institutions requiring custom student capacity & priority support.',
    offerTitle: 'Custom Scaling & Dedicated Cloud',
    offerDescription: 'Custom capacity scaling, dedicated database, and priority SLA helpline.',
    badge: 'CUSTOM & DEDICATED',
    maxStudentLimit: 1500,
    isTrial: false,
    isEnterprise: true,
    isActive: true,
    displayOrder: 4,
    features: [
      '701+ Active Student Capacity',
      'All Operational Modules Activated',
      'Dedicated Server & Database Infrastructure',
      'Custom Multi-Domain / White-label Support',
      'Priority 24/7 Enterprise Helpline',
      'Dedicated Account Manager',
      'Custom API & Payment Gateway Integration',
      'Data Backup & SLA Export Guarantee',
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

  console.log(`Super Admin created/verified: ${superAdmin.email}`);

  // 2. Seed Default Subscription Plans
  console.log('Seeding subscription plans matching current Prisma schema...');
  for (const plan of DEFAULT_PLANS) {
    const upsertedPlan = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(
      `Subscription plan ready: ${upsertedPlan.name} (${upsertedPlan.code}) - Max Students: ${
        upsertedPlan.maxStudentLimit ?? 'Unlimited'
      } - Final Price: ₹${upsertedPlan.finalPrice}`
    );
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
