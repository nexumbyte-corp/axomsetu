/**
 * AxomSetu Platform Legal Constants
 * Versioned Terms & Conditions and Privacy Policy Configuration
 */

export const CURRENT_TERMS_VERSION = '1.0';
export const CURRENT_PRIVACY_POLICY_VERSION = '1.0';

const TERMS_CLAUSES = [
  {
    id: 1,
    title: 'Acceptance',
    content: 'By registering or using AxomSetu, you agree to these Terms & Conditions and the Privacy Policy.',
  },
  {
    id: 2,
    title: 'Authorized Registration',
    content: 'The person registering a school confirms that they are authorized to create and manage the school\'s AxomSetu account.',
  },
  {
    id: 3,
    title: 'Accurate Information',
    content: 'The school must provide accurate and up-to-date school, administrator, student, staff, and other information.',
  },
  {
    id: 4,
    title: 'School Data Ownership',
    content: 'The school retains ownership of the data it enters into AxomSetu. NEXUMBYTE only processes such data as necessary to provide and operate the service, subject to applicable law.',
  },
  {
    id: 5,
    title: 'Personal & Student Data',
    content: 'The school is responsible for having the necessary authority and permissions to provide and process student, guardian, staff, and other personal information through AxomSetu.',
  },
  {
    id: 6,
    title: 'Account Security',
    content: 'Schools and users are responsible for protecting their login credentials, using individual accounts where appropriate, and reporting unauthorized access.',
  },
  {
    id: 7,
    title: 'User Permissions',
    content: 'The school is responsible for assigning appropriate roles and permissions to its users and removing access when no longer required.',
  },
  {
    id: 8,
    title: 'Subscription Plans',
    content: 'AxomSetu may provide Trial, Monthly, Quarterly, Yearly, or other plans. Each plan may have different prices, features, duration, discounts, and offers.',
  },
  {
    id: 9,
    title: 'Trial',
    content: 'Trial access, duration, eligibility, and available features are determined by AxomSetu and may change for future registrations.',
  },
  {
    id: 10,
    title: 'Payment',
    content: 'Available payment methods may include Cash, UPI, and online payment providers such as Razorpay when available. Payment requests may require verification before activation.',
  },
  {
    id: 11,
    title: 'Subscription Activation',
    content: 'A subscription becomes active only after successful payment verification and activation by AxomSetu.',
  },
  {
    id: 12,
    title: 'No Refund',
    content: 'Subscription purchases are non-refundable after activation, except where required by applicable law or expressly approved by NEXUMBYTE. Unused subscription time is generally not refundable or convertible to cash.',
  },
  {
    id: 13,
    title: 'Subscription Expiry',
    content: 'After subscription expiry, access to subscription-dependent features may be restricted until the school renews or purchases a new plan.',
  },
  {
    id: 14,
    title: 'Pricing & Offers',
    content: 'Plan prices, features, discounts, and promotional offers may be changed by NEXUMBYTE. The applicable details are those displayed at the time of purchase.',
  },
  {
    id: 15,
    title: 'Financial Responsibility',
    content: 'AxomSetu provides software for managing fees, payroll, expenses, receipts, and financial records. The school remains responsible for the accuracy and legality of its financial records.',
  },
  {
    id: 16,
    title: 'Acceptable Use',
    content: 'Users must not use AxomSetu for illegal activities, fraud, unauthorized access, security attacks, malware, abuse of APIs, or attempts to access another school\'s data.',
  },
  {
    id: 17,
    title: 'Data Security',
    content: 'NEXUMBYTE will implement reasonable security measures to protect the platform and data. However, no internet-based system can guarantee absolute security.',
  },
  {
    id: 18,
    title: 'Data Backup',
    content: 'NEXUMBYTE may maintain backups for service continuity and recovery. Backup policies may vary according to the platform\'s infrastructure.',
  },
  {
    id: 19,
    title: 'Data Export',
    content: 'Subject to available functionality and applicable policies, schools may export their available data through supported AxomSetu export mechanisms.',
  },
  {
    id: 20,
    title: 'Data Retention & Deletion',
    content: 'Data may be retained as necessary to provide the service, maintain backups, meet legal obligations, resolve disputes, and protect legitimate interests. Deletion will follow applicable retention policies and law.',
  },
  {
    id: 21,
    title: 'Intellectual Property',
    content: 'AxomSetu software, source code, platform architecture, interface, branding, and related technology belong to NEXUMBYTE or its licensors. School data and school-owned branding remain the school\'s property.',
  },
  {
    id: 22,
    title: 'Third-Party Services',
    content: 'AxomSetu may use third-party services such as payment gateways, cloud infrastructure, email/SMS providers, and other integrations. Their availability may depend on those providers.',
  },
  {
    id: 23,
    title: 'Service Availability',
    content: 'NEXUMBYTE aims to provide reliable service but does not guarantee uninterrupted or error-free operation. Maintenance, technical failures, third-party failures, security incidents, and other circumstances may affect availability.',
  },
  {
    id: 24,
    title: 'Suspension',
    content: 'NEXUMBYTE may suspend or restrict access for serious violations, non-payment, fraud, security threats, unauthorized access, illegal activity, or legal requirements.',
  },
  {
    id: 25,
    title: 'Termination',
    content: 'The school may discontinue its use of AxomSetu according to the applicable procedures. NEXUMBYTE may terminate or suspend accounts for serious violations or other legitimate reasons.',
  },
  {
    id: 26,
    title: 'Changes to AxomSetu',
    content: 'NEXUMBYTE may add, modify, replace, or discontinue features, modules, integrations, and other parts of the platform.',
  },
  {
    id: 27,
    title: 'Changes to Terms',
    content: 'NEXUMBYTE may update these Terms. Updated versions will be made available through AxomSetu or official communication channels.',
  },
  {
    id: 28,
    title: 'Electronic Acceptance',
    content: 'Acceptance through the AxomSetu checkbox/button constitutes electronic acceptance of the applicable Terms, subject to applicable law. AxomSetu may record the accepted version, date, time, and relevant account information.',
  },
  {
    id: 29,
    title: 'Governing Law',
    content: 'These Terms are governed by the applicable laws of India.',
  },
  {
    id: 30,
    title: 'Contact & Support',
    content: 'Questions, complaints, account issues, and other concerns may be submitted through the official AxomSetu/NEXUMBYTE support channels.',
  },
  {
    id: 31,
    title: 'Severability',
    content: 'If any provision is found invalid or unenforceable, the remaining provisions will continue to apply to the extent permitted by law.',
  },
  {
    id: 32,
    title: 'Entire Agreement',
    content: 'These Terms, together with the Privacy Policy and applicable subscription policies, form the agreement governing use of AxomSetu.',
  },
];

const PRIVACY_POLICY_SECTIONS = [
  {
    id: 1,
    title: '1. Information We Collect',
    content: 'We collect information required to operate the AxomSetu School SaaS platform, including school profiles, administrator names, contact numbers, email addresses, student records, staff payroll information, and fee receipts entered into the portal by authorized school users.',
  },
  {
    id: 2,
    title: '2. How We Use Data',
    content: 'School data is processed strictly to provide SaaS operational services including student record management, fee calculation, receipt generation, payroll processing, and financial reporting. Data is never sold or rented to third-party advertisers.',
  },
  {
    id: 3,
    title: '3. Data Ownership & Protection',
    content: 'The subscribing school tenant retains total ownership of all institution, student, and employee data. NEXUMBYTE implements enterprise-grade encryption, database multi-tenancy access isolation, and periodic database backups to protect confidentiality.',
  },
  {
    id: 4,
    title: '4. Third-Party Service Providers',
    content: 'We may utilize trusted cloud hosting infrastructure, payment gateways (such as Razorpay), and SMS/Email notification providers solely to deliver platform functionality.',
  },
  {
    id: 5,
    title: '5. Student & Minor Privacy',
    content: 'Schools are responsible for securing necessary legal consent from parents or legal guardians to upload and process student records in compliance with applicable laws.',
  },
  {
    id: 6,
    title: '6. Electronic Logs & Compliance',
    content: 'AxomSetu logs administrative actions, IP addresses, session activity, and explicit legal consent receipts (Terms & Conditions version acceptances) for security audit and compliance purposes.',
  },
  {
    id: 7,
    title: '7. Policy Updates & Contact',
    content: 'This Privacy Policy may be updated periodically. For privacy inquiries, data export requests, or support, contact official NEXUMBYTE support channels.',
  },
];
