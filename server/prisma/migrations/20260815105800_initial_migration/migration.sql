-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SCHOOL_ADMIN');

-- CreateEnum
CREATE TYPE "SchoolUserRole" AS ENUM ('OWNER', 'SCHOOL_ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'LEFT', 'GRADUATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'PROMOTED', 'REPEATED', 'LEFT');

-- CreateEnum
CREATE TYPE "HostelStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "HostelGenderType" AS ENUM ('BOYS', 'GIRLS', 'COMBINED');

-- CreateEnum
CREATE TYPE "HostelBedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HostelEnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'EXITED');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "FinancialSourceType" AS ENUM ('FEE_COLLECTION', 'FUND_ADDED', 'SALARY_PAYMENT', 'EXPENSE', 'STAFF_ADVANCE', 'ADVANCE_RECOVERY', 'FEE_REFUND', 'OPENING_BALANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeePaymentStatus" AS ENUM ('SUCCESS', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "FeeMonth" AS ENUM ('JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER');

-- CreateEnum
CREATE TYPE "GenerationMode" AS ENUM ('ENTIRE_SCHOOL', 'BY_CLASS', 'BY_STUDENT');

-- CreateEnum
CREATE TYPE "FeeCategory" AS ENUM ('ACADEMIC', 'HOSTEL');

-- CreateEnum
CREATE TYPE "FeeBillingRule" AS ENUM ('ONE_TIME_PER_ACADEMIC_YEAR', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FeeTypeSystemCode" AS ENUM ('ADMISSION', 'TUITION', 'HOSTEL', 'HOSTEL_ADMISSION', 'MISC');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESIGNED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('TEACHER', 'ADMINISTRATOR', 'ACCOUNTANT', 'LIBRARIAN', 'DRIVER', 'SUPPORT_STAFF', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRIAL', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('CASH', 'UPI', 'OTHER', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentProvider" AS ENUM ('MANUAL', 'RAZORPAY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SCHOOL_ADMIN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "udise_code" TEXT,
    "affiliation_no" TEXT,
    "website" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_admins" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "school_role" "SchoolUserRole" NOT NULL DEFAULT 'SCHOOL_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_user_permissions" (
    "id" UUID NOT NULL,
    "school_admin_id" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID,
    "session_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "has_stream" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mediums" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "mediums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "admission_no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "guardian_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "photo_url" TEXT,
    "gender" TEXT,
    "caste" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID,
    "medium_id" UUID NOT NULL,
    "stream_id" UUID,
    "roll_no" INTEGER,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_hostel_enrollments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "student_enrollment_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "monthly_start_date" DATE,
    "end_date" DATE,
    "monthly_hostel_fee" DECIMAL(12,2) NOT NULL,
    "status" "HostelStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_hostel_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_types" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" "FeeCategory" NOT NULL DEFAULT 'ACADEMIC',
    "billing_rule" "FeeBillingRule" NOT NULL DEFAULT 'MONTHLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "system_code" "FeeTypeSystemCode",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "medium_id" UUID NOT NULL,
    "stream_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure_heads" (
    "id" UUID NOT NULL,
    "fee_structure_id" UUID NOT NULL,
    "fee_type_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_structure_heads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_overrides" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "fee_type_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_fee_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_generation_batches" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "month" "FeeMonth" NOT NULL,
    "mode" "GenerationMode" NOT NULL,
    "class_id" UUID,
    "medium_id" UUID,
    "stream_id" UUID,
    "section_id" UUID,
    "student_id" UUID,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "generated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "details" JSONB,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_generation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_charges" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "student_enrollment_id" UUID,
    "fee_type_id" UUID NOT NULL,
    "fee_structure_id" UUID,
    "generation_batch_id" UUID,
    "month" "FeeMonth" NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "original_amount" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "overridden_by_id" UUID,
    "overridden_at" TIMESTAMPTZ,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "status" "ChargeStatus" NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_fee_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_payments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "reference_number" TEXT,
    "received_amount" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "received_by_id" UUID,
    "status" "FeePaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "category_id" UUID NOT NULL,
    "expense_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "reference_no" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_sources" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fund_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transactions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "fund_source_id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "reference_number" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "transaction_date" DATE NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "sourceType" "FinancialSourceType" NOT NULL,
    "source_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "reference_number" TEXT,
    "description" TEXT,
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reversed_transaction_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" TEXT NOT NULL DEFAULT '',
    "document_type" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'REC',
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'TEACHER',
    "department" TEXT,
    "designation" TEXT,
    "joining_date" DATE,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bank_name" TEXT,
    "bank_account_no" TEXT,
    "ifsc_code" TEXT,
    "advance_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_advances" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "recovered" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advance_date" DATE NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "reference_no" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_salary_setups" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "baseSalary" DECIMAL(12,2) NOT NULL,
    "components" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_salary_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_payrolls" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "month" "FeeMonth" NOT NULL,
    "year" INTEGER NOT NULL,
    "working_days" INTEGER NOT NULL DEFAULT 26,
    "worked_days" INTEGER NOT NULL DEFAULT 26,
    "paid_leave" INTEGER NOT NULL DEFAULT 0,
    "unpaid_leave" INTEGER NOT NULL DEFAULT 0,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "attendance_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advance_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ChargeStatus" NOT NULL DEFAULT 'UNPAID',
    "remarks" TEXT,
    "prepared_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "monthly_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_payments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "payment_number" TEXT NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "months" "FeeMonth"[],
    "year" INTEGER NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advance_deducted" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "reference_no" TEXT,
    "remarks" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_payment_allocations" (
    "id" UUID NOT NULL,
    "salary_payment_id" UUID NOT NULL,
    "monthly_payroll_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "duration_value" INTEGER NOT NULL,
    "duration_unit" "DurationUnit" NOT NULL DEFAULT 'MONTH',
    "base_price" DECIMAL(12,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "features" JSONB NOT NULL,
    "offer_title" TEXT,
    "offer_description" TEXT,
    "badge" TEXT,
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subscriptions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "plan_id" UUID,
    "plan_name_snapshot" TEXT NOT NULL,
    "duration_snapshot" TEXT NOT NULL,
    "base_price_snapshot" DECIMAL(12,2) NOT NULL,
    "discount_snapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_price_snapshot" DECIMAL(12,2) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ,
    "next_billing_date" TIMESTAMPTZ,
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "payment_status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PAID',
    "payment_provider" "SubscriptionPaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "provider_payment_id" TEXT,
    "provider_order_id" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "subscription_id" UUID,
    "plan_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_method" "SubscriptionPaymentMethod" NOT NULL,
    "status" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference_number" TEXT,
    "provider" "SubscriptionPaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "provider_payment_id" TEXT,
    "provider_order_id" TEXT,
    "rejection_reason" TEXT,
    "remarks" TEXT,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostels" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" "HostelGenderType" NOT NULL DEFAULT 'COMBINED',
    "description" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_rooms" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "floor" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "room_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hostel_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_beds" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bed_number" TEXT NOT NULL,
    "status" "HostelBedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hostel_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_enrollments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "hostel_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "bed_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "exit_reason" TEXT,
    "status" "HostelEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hostel_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_transfer_histories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "from_hostel_id" UUID NOT NULL,
    "from_room_id" UUID NOT NULL,
    "from_bed_id" UUID NOT NULL,
    "to_hostel_id" UUID NOT NULL,
    "to_room_id" UUID NOT NULL,
    "to_bed_id" UUID NOT NULL,
    "transfer_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_transfer_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_fee_configs" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "hostel_id" UUID,
    "admission_fee_enabled" BOOLEAN NOT NULL DEFAULT false,
    "admission_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_fee_enabled" BOOLEAN NOT NULL DEFAULT false,
    "monthly_fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "admission_fee_type_id" UUID,
    "monthly_fee_type_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "hostel_fee_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

-- CreateIndex
CREATE INDEX "school_admins_school_id_idx" ON "school_admins"("school_id");

-- CreateIndex
CREATE INDEX "school_admins_user_id_idx" ON "school_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_admins_school_id_user_id_key" ON "school_admins"("school_id", "user_id");

-- CreateIndex
CREATE INDEX "school_user_permissions_school_admin_id_idx" ON "school_user_permissions"("school_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_user_permissions_school_admin_id_permission_key" ON "school_user_permissions"("school_admin_id", "permission");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_session_token_hash_idx" ON "user_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_revoked_at_idx" ON "user_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "academic_years_school_id_idx" ON "academic_years"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_school_id_name_key" ON "academic_years"("school_id", "name");

-- CreateIndex
CREATE INDEX "classes_school_id_idx" ON "classes"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_school_id_name_key" ON "classes"("school_id", "name");

-- CreateIndex
CREATE INDEX "sections_school_id_idx" ON "sections"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_school_id_name_key" ON "sections"("school_id", "name");

-- CreateIndex
CREATE INDEX "mediums_school_id_idx" ON "mediums"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "mediums_school_id_name_key" ON "mediums"("school_id", "name");

-- CreateIndex
CREATE INDEX "streams_school_id_idx" ON "streams"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "streams_school_id_name_key" ON "streams"("school_id", "name");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "students_school_id_status_idx" ON "students"("school_id", "status");

-- CreateIndex
CREATE INDEX "students_school_id_name_idx" ON "students"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "students_school_id_admission_no_key" ON "students"("school_id", "admission_no");

-- CreateIndex
CREATE INDEX "student_enrollments_school_id_idx" ON "student_enrollments"("school_id");

-- CreateIndex
CREATE INDEX "student_enrollments_student_id_idx" ON "student_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "student_enrollments_academic_year_id_idx" ON "student_enrollments"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_enrollments_school_id_academic_year_id_class_id_sec_idx" ON "student_enrollments"("school_id", "academic_year_id", "class_id", "section_id");

-- CreateIndex
CREATE INDEX "student_enrollments_school_id_status_idx" ON "student_enrollments"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_school_id_academic_year_id_student_id_key" ON "student_enrollments"("school_id", "academic_year_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_school_id_academic_year_id_class_id_sec_key" ON "student_enrollments"("school_id", "academic_year_id", "class_id", "section_id", "roll_no");

-- CreateIndex
CREATE INDEX "student_hostel_enrollments_school_id_idx" ON "student_hostel_enrollments"("school_id");

-- CreateIndex
CREATE INDEX "student_hostel_enrollments_student_id_idx" ON "student_hostel_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "fee_types_school_id_idx" ON "fee_types"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_school_id_name_key" ON "fee_types"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_school_id_system_code_key" ON "fee_types"("school_id", "system_code");

-- CreateIndex
CREATE INDEX "fee_structures_school_id_idx" ON "fee_structures"("school_id");

-- CreateIndex
CREATE INDEX "fee_structures_academic_year_id_idx" ON "fee_structures"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structures_school_id_academic_year_id_class_id_medium_i_key" ON "fee_structures"("school_id", "academic_year_id", "class_id", "medium_id", "stream_id");

-- CreateIndex
CREATE INDEX "fee_structure_heads_fee_structure_id_idx" ON "fee_structure_heads"("fee_structure_id");

-- CreateIndex
CREATE INDEX "fee_structure_heads_fee_type_id_idx" ON "fee_structure_heads"("fee_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_heads_fee_structure_id_fee_type_id_key" ON "fee_structure_heads"("fee_structure_id", "fee_type_id");

-- CreateIndex
CREATE INDEX "student_fee_overrides_school_id_idx" ON "student_fee_overrides"("school_id");

-- CreateIndex
CREATE INDEX "student_fee_overrides_student_id_idx" ON "student_fee_overrides"("student_id");

-- CreateIndex
CREATE INDEX "student_fee_overrides_academic_year_id_idx" ON "student_fee_overrides"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_overrides_school_id_student_id_academic_year_id_key" ON "student_fee_overrides"("school_id", "student_id", "academic_year_id", "fee_type_id");

-- CreateIndex
CREATE INDEX "fee_generation_batches_school_id_idx" ON "fee_generation_batches"("school_id");

-- CreateIndex
CREATE INDEX "fee_generation_batches_academic_year_id_idx" ON "fee_generation_batches"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_fee_charges_school_id_idx" ON "student_fee_charges"("school_id");

-- CreateIndex
CREATE INDEX "student_fee_charges_student_id_idx" ON "student_fee_charges"("student_id");

-- CreateIndex
CREATE INDEX "student_fee_charges_academic_year_id_idx" ON "student_fee_charges"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_fee_charges_generation_batch_id_idx" ON "student_fee_charges"("generation_batch_id");

-- CreateIndex
CREATE INDEX "student_fee_charges_school_id_student_id_status_idx" ON "student_fee_charges"("school_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "student_fee_charges_school_id_academic_year_id_month_status_idx" ON "student_fee_charges"("school_id", "academic_year_id", "month", "status");

-- CreateIndex
CREATE INDEX "student_fee_charges_school_id_status_due_date_idx" ON "student_fee_charges"("school_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_charges_school_id_academic_year_id_student_enro_key" ON "student_fee_charges"("school_id", "academic_year_id", "student_enrollment_id", "fee_type_id", "title", "month");

-- CreateIndex
CREATE INDEX "fee_payments_school_id_idx" ON "fee_payments"("school_id");

-- CreateIndex
CREATE INDEX "fee_payments_student_id_idx" ON "fee_payments"("student_id");

-- CreateIndex
CREATE INDEX "fee_payments_academic_year_id_idx" ON "fee_payments"("academic_year_id");

-- CreateIndex
CREATE INDEX "fee_payments_receipt_number_idx" ON "fee_payments"("receipt_number");

-- CreateIndex
CREATE INDEX "fee_payments_payment_date_idx" ON "fee_payments"("payment_date");

-- CreateIndex
CREATE INDEX "fee_payments_school_id_payment_date_idx" ON "fee_payments"("school_id", "payment_date");

-- CreateIndex
CREATE INDEX "fee_payments_school_id_student_id_idx" ON "fee_payments"("school_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_payments_school_id_receipt_number_key" ON "fee_payments"("school_id", "receipt_number");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_charge_id_idx" ON "payment_allocations"("charge_id");

-- CreateIndex
CREATE INDEX "expense_categories_school_id_idx" ON "expense_categories"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_school_id_name_key" ON "expense_categories"("school_id", "name");

-- CreateIndex
CREATE INDEX "expenses_school_id_idx" ON "expenses"("school_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "fund_sources_school_id_idx" ON "fund_sources"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_sources_school_id_name_key" ON "fund_sources"("school_id", "name");

-- CreateIndex
CREATE INDEX "fund_transactions_school_id_idx" ON "fund_transactions"("school_id");

-- CreateIndex
CREATE INDEX "fund_transactions_fund_source_id_idx" ON "fund_transactions"("fund_source_id");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_idx" ON "financial_transactions"("school_id");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_transaction_date_idx" ON "financial_transactions"("school_id", "transaction_date");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_type_idx" ON "financial_transactions"("school_id", "type");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_sourceType_idx" ON "financial_transactions"("school_id", "sourceType");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_source_id_idx" ON "financial_transactions"("school_id", "source_id");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_academic_year_id_transacti_idx" ON "financial_transactions"("school_id", "academic_year_id", "transaction_date");

-- CreateIndex
CREATE INDEX "financial_transactions_school_id_sourceType_source_id_idx" ON "financial_transactions"("school_id", "sourceType", "source_id");

-- CreateIndex
CREATE INDEX "document_sequences_school_id_idx" ON "document_sequences"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_school_id_document_type_academic_year_id_key" ON "document_sequences"("school_id", "document_type", "academic_year_id");

-- CreateIndex
CREATE INDEX "audit_logs_school_id_idx" ON "audit_logs"("school_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_school_id_created_at_idx" ON "audit_logs"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "staff_school_id_idx" ON "staff"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_school_id_employee_id_key" ON "staff"("school_id", "employee_id");

-- CreateIndex
CREATE INDEX "staff_advances_school_id_idx" ON "staff_advances"("school_id");

-- CreateIndex
CREATE INDEX "staff_advances_staff_id_idx" ON "staff_advances"("staff_id");

-- CreateIndex
CREATE INDEX "staff_salary_setups_school_id_idx" ON "staff_salary_setups"("school_id");

-- CreateIndex
CREATE INDEX "staff_salary_setups_staff_id_idx" ON "staff_salary_setups"("staff_id");

-- CreateIndex
CREATE INDEX "staff_salary_setups_academic_year_id_idx" ON "staff_salary_setups"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_salary_setups_school_id_staff_id_academic_year_id_key" ON "staff_salary_setups"("school_id", "staff_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "monthly_payrolls_school_id_idx" ON "monthly_payrolls"("school_id");

-- CreateIndex
CREATE INDEX "monthly_payrolls_staff_id_idx" ON "monthly_payrolls"("staff_id");

-- CreateIndex
CREATE INDEX "monthly_payrolls_academic_year_id_idx" ON "monthly_payrolls"("academic_year_id");

-- CreateIndex
CREATE INDEX "monthly_payrolls_school_id_staff_id_month_year_idx" ON "monthly_payrolls"("school_id", "staff_id", "month", "year");

-- CreateIndex
CREATE INDEX "monthly_payrolls_school_id_status_idx" ON "monthly_payrolls"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payrolls_school_id_staff_id_academic_year_id_month__key" ON "monthly_payrolls"("school_id", "staff_id", "academic_year_id", "month", "year");

-- CreateIndex
CREATE INDEX "salary_payments_school_id_idx" ON "salary_payments"("school_id");

-- CreateIndex
CREATE INDEX "salary_payments_staff_id_idx" ON "salary_payments"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "salary_payments_school_id_payment_number_key" ON "salary_payments"("school_id", "payment_number");

-- CreateIndex
CREATE INDEX "salary_payment_allocations_salary_payment_id_idx" ON "salary_payment_allocations"("salary_payment_id");

-- CreateIndex
CREATE INDEX "salary_payment_allocations_monthly_payroll_id_idx" ON "salary_payment_allocations"("monthly_payroll_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "school_subscriptions_school_id_idx" ON "school_subscriptions"("school_id");

-- CreateIndex
CREATE INDEX "school_subscriptions_plan_id_idx" ON "school_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "school_subscriptions_status_end_date_idx" ON "school_subscriptions"("status", "end_date");

-- CreateIndex
CREATE INDEX "school_subscriptions_school_id_status_idx" ON "school_subscriptions"("school_id", "status");

-- CreateIndex
CREATE INDEX "subscription_payments_school_id_idx" ON "subscription_payments"("school_id");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_payments_plan_id_idx" ON "subscription_payments"("plan_id");

-- CreateIndex
CREATE INDEX "hostels_school_id_idx" ON "hostels"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "hostels_school_id_name_key" ON "hostels"("school_id", "name");

-- CreateIndex
CREATE INDEX "hostel_rooms_school_id_idx" ON "hostel_rooms"("school_id");

-- CreateIndex
CREATE INDEX "hostel_rooms_hostel_id_idx" ON "hostel_rooms"("hostel_id");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_rooms_hostel_id_room_number_key" ON "hostel_rooms"("hostel_id", "room_number");

-- CreateIndex
CREATE INDEX "hostel_beds_school_id_idx" ON "hostel_beds"("school_id");

-- CreateIndex
CREATE INDEX "hostel_beds_hostel_id_idx" ON "hostel_beds"("hostel_id");

-- CreateIndex
CREATE INDEX "hostel_beds_room_id_idx" ON "hostel_beds"("room_id");

-- CreateIndex
CREATE INDEX "hostel_beds_school_id_status_idx" ON "hostel_beds"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_beds_room_id_bed_number_key" ON "hostel_beds"("room_id", "bed_number");

-- CreateIndex
CREATE INDEX "hostel_enrollments_school_id_idx" ON "hostel_enrollments"("school_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_student_id_idx" ON "hostel_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_academic_year_id_idx" ON "hostel_enrollments"("academic_year_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_hostel_id_idx" ON "hostel_enrollments"("hostel_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_room_id_idx" ON "hostel_enrollments"("room_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_bed_id_idx" ON "hostel_enrollments"("bed_id");

-- CreateIndex
CREATE INDEX "hostel_enrollments_school_id_status_idx" ON "hostel_enrollments"("school_id", "status");

-- CreateIndex
CREATE INDEX "hostel_transfer_histories_school_id_idx" ON "hostel_transfer_histories"("school_id");

-- CreateIndex
CREATE INDEX "hostel_transfer_histories_enrollment_id_idx" ON "hostel_transfer_histories"("enrollment_id");

-- CreateIndex
CREATE INDEX "hostel_fee_configs_school_id_idx" ON "hostel_fee_configs"("school_id");

-- CreateIndex
CREATE INDEX "hostel_fee_configs_academic_year_id_idx" ON "hostel_fee_configs"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "hostel_fee_configs_school_id_academic_year_id_hostel_id_key" ON "hostel_fee_configs"("school_id", "academic_year_id", "hostel_id");

-- AddForeignKey
ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_user_permissions" ADD CONSTRAINT "school_user_permissions_school_admin_id_fkey" FOREIGN KEY ("school_admin_id") REFERENCES "school_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mediums" ADD CONSTRAINT "mediums_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "mediums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_hostel_enrollments" ADD CONSTRAINT "student_hostel_enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_hostel_enrollments" ADD CONSTRAINT "student_hostel_enrollments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_hostel_enrollments" ADD CONSTRAINT "student_hostel_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_hostel_enrollments" ADD CONSTRAINT "student_hostel_enrollments_student_enrollment_id_fkey" FOREIGN KEY ("student_enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "mediums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_heads" ADD CONSTRAINT "fee_structure_heads_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structure_heads" ADD CONSTRAINT "fee_structure_heads_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_medium_id_fkey" FOREIGN KEY ("medium_id") REFERENCES "mediums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_generation_batches" ADD CONSTRAINT "fee_generation_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_student_enrollment_id_fkey" FOREIGN KEY ("student_enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_generation_batch_id_fkey" FOREIGN KEY ("generation_batch_id") REFERENCES "fee_generation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_charges" ADD CONSTRAINT "student_fee_charges_overridden_by_id_fkey" FOREIGN KEY ("overridden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "fee_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_fee_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_sources" ADD CONSTRAINT "fund_sources_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_fund_source_id_fkey" FOREIGN KEY ("fund_source_id") REFERENCES "fund_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advances" ADD CONSTRAINT "staff_advances_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_setups" ADD CONSTRAINT "staff_salary_setups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_setups" ADD CONSTRAINT "staff_salary_setups_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salary_setups" ADD CONSTRAINT "staff_salary_setups_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment_allocations" ADD CONSTRAINT "salary_payment_allocations_salary_payment_id_fkey" FOREIGN KEY ("salary_payment_id") REFERENCES "salary_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_payment_allocations" ADD CONSTRAINT "salary_payment_allocations_monthly_payroll_id_fkey" FOREIGN KEY ("monthly_payroll_id") REFERENCES "monthly_payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "school_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_rooms" ADD CONSTRAINT "hostel_rooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_rooms" ADD CONSTRAINT "hostel_rooms_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_beds" ADD CONSTRAINT "hostel_beds_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_beds" ADD CONSTRAINT "hostel_beds_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_beds" ADD CONSTRAINT "hostel_beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "hostel_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "hostel_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_enrollments" ADD CONSTRAINT "hostel_enrollments_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "hostel_beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "hostel_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_from_hostel_id_fkey" FOREIGN KEY ("from_hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "hostel_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_from_bed_id_fkey" FOREIGN KEY ("from_bed_id") REFERENCES "hostel_beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_to_hostel_id_fkey" FOREIGN KEY ("to_hostel_id") REFERENCES "hostels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "hostel_rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_transfer_histories" ADD CONSTRAINT "hostel_transfer_histories_to_bed_id_fkey" FOREIGN KEY ("to_bed_id") REFERENCES "hostel_beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_fee_configs" ADD CONSTRAINT "hostel_fee_configs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_fee_configs" ADD CONSTRAINT "hostel_fee_configs_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_fee_configs" ADD CONSTRAINT "hostel_fee_configs_hostel_id_fkey" FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_fee_configs" ADD CONSTRAINT "hostel_fee_configs_admission_fee_type_id_fkey" FOREIGN KEY ("admission_fee_type_id") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_fee_configs" ADD CONSTRAINT "hostel_fee_configs_monthly_fee_type_id_fkey" FOREIGN KEY ("monthly_fee_type_id") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

