/**
 * SEO Configuration & Keyword Matrix for AxomSetu School Management System & ERP
 */

export const DEFAULT_SEO = {
  siteName: 'AxomSetu',
  siteUrl: 'https://nexumbyte.tech',
  defaultTitle: 'AxomSetu — Best School Management Software & School ERP System',
  titleTemplate: '%s | AxomSetu School ERP',
  defaultDescription:
    'AxomSetu is an all-in-one cloud school management software and ERP solution. Manage student admissions, fee collection, biometric attendance, staff payroll, hostel, finance, exams, and reporting seamlessly.',
  defaultKeywords: [
    'school management system',
    'school erp software',
    'best school management software',
    'student information system',
    'school fee management software',
    'online school fee collection',
    'school attendance system',
    'school payroll software',
    'hostel management software',
    'school financial accounting',
    'school saas',
    'axomsetu',
    'nexumbyte'
  ].join(', '),
  defaultOgImage: '/app-icon.png',
  twitterHandle: '@axomsetu',
  author: 'NEXUMBYTE'
};

export const PAGE_SEO = {
  landing: {
    title: 'AxomSetu — Best School Management System & School ERP Software',
    overrideFull: true,
    description:
      'Empower your educational institution with AxomSetu — the leading cloud-based School ERP & Management Software. Automate fees, attendance, student records, staff payroll, finance, and hostel management.',
    keywords:
      'school management software, school erp, school management system, student information system, fee management software, school administration app, student attendance software, school saas',
    canonical: '/'
  },
  subscription: {
    title: 'Pricing & Subscription Plans — AxomSetu School ERP',
    overrideFull: true,
    description:
      'Flexible and transparent pricing plans for schools of all sizes. Choose the best school management ERP plan with student fee automation, payroll, hostel tracking, and custom reports.',
    keywords:
      'school erp pricing, school management software cost, school software plans, affordable school erp, school saas subscription',
    canonical: '/subscription'
  },
  contact: {
    title: 'Contact Us — AxomSetu School Management Platform',
    overrideFull: true,
    description:
      'Get in touch with AxomSetu support and sales team. Request a free demo of our School ERP software or get technical assistance for your institution.',
    keywords:
      'contact school erp, school management demo, school software customer support, axomsetu contact, nexumbyte school saas',
    canonical: '/contact'
  },
  login: {
    title: 'Portal Login — AxomSetu School ERP Platform',
    overrideFull: true,
    description:
      'Secure login portal for school administrators, staff, teachers, and super admins. Access student records, fee collection, payroll, and school operations.',
    keywords:
      'school erp login, school management portal, axomsetu admin login, teacher portal login, student fee portal',
    canonical: '/login'
  },
  register: {
    title: 'Register Your School — Get Started with AxomSetu ERP',
    overrideFull: true,
    description:
      'Register your school or educational institution on AxomSetu. Start streamlining school administration, student records, fee receipts, and staff payroll today.',
    keywords:
      'register school online, sign up school management software, create school erp account, axomsetu school onboarding',
    canonical: '/register'
  }
};

export default { DEFAULT_SEO, PAGE_SEO };
