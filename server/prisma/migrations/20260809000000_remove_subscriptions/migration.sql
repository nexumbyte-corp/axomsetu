-- Drop subscription-related tables and constraints
-- This migration removes the subscription module from the system

-- Drop foreign key constraints first
ALTER TABLE "subscription_payments" DROP CONSTRAINT IF EXISTS "subscription_payments_school_subscription_id_fkey";
ALTER TABLE "school_subscriptions" DROP CONSTRAINT IF EXISTS "school_subscriptions_school_id_fkey";
ALTER TABLE "school_subscriptions" DROP CONSTRAINT IF EXISTS "school_subscriptions_plan_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "subscription_payments_school_subscription_id_idx";
DROP INDEX IF EXISTS "subscription_payments_school_id_idx";
DROP INDEX IF EXISTS "school_subscriptions_school_id_idx";
DROP INDEX IF EXISTS "subscription_plans_name_key";

-- Drop tables
DROP TABLE IF EXISTS "subscription_payments";
DROP TABLE IF EXISTS "school_subscriptions";
DROP TABLE IF EXISTS "subscription_plans";

-- Drop enum type if it exists
DROP TYPE IF EXISTS "SubscriptionStatus";
