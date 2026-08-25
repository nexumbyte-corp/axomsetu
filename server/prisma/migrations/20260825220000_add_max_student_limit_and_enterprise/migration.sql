-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE IF NOT EXISTS 'ENTERPRISE';

-- AlterTable
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "max_students" INTEGER;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "is_enterprise" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "school_subscriptions" ADD COLUMN IF NOT EXISTS "max_students_snapshot" INTEGER;
ALTER TABLE "school_subscriptions" ADD COLUMN IF NOT EXISTS "is_enterprise" BOOLEAN NOT NULL DEFAULT false;
