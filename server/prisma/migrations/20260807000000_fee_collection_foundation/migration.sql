-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT');

-- CreateEnum
CREATE TYPE "FeePaymentStatus" AS ENUM ('SUCCESS', 'VOID');

-- AlterEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'WAIVED';

-- DropForeignKey
ALTER TABLE "fee_payment_items" DROP CONSTRAINT IF EXISTS "fee_payment_items_fee_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "fee_payment_items" DROP CONSTRAINT IF EXISTS "fee_payment_items_student_fee_charge_id_fkey";

-- DropForeignKey
ALTER TABLE "fee_payments" DROP CONSTRAINT IF EXISTS "fee_payments_created_by_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "fee_payments_school_id_receipt_no_key";

-- AlterTable
ALTER TABLE "fee_payments" DROP COLUMN IF EXISTS "created_by_id",
DROP COLUMN IF EXISTS "payment_method",
DROP COLUMN IF EXISTS "receipt_no",
DROP COLUMN IF EXISTS "reference_no",
DROP COLUMN IF EXISTS "total_amount",
ADD COLUMN IF NOT EXISTS "payment_mode" "PaymentMode" NOT NULL,
ADD COLUMN IF NOT EXISTS "receipt_number" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "received_amount" DECIMAL(12,2) NOT NULL,
ADD COLUMN IF NOT EXISTS "received_by_id" UUID,
ADD COLUMN IF NOT EXISTS "status" "FeePaymentStatus" NOT NULL DEFAULT 'SUCCESS';

-- DropTable
DROP TABLE IF EXISTS "fee_payment_items";

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_allocations_charge_id_idx" ON "payment_allocations"("charge_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fee_payments_academic_year_id_idx" ON "fee_payments"("academic_year_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fee_payments_receipt_number_idx" ON "fee_payments"("receipt_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fee_payments_payment_date_idx" ON "fee_payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "fee_payments_school_id_receipt_number_key" ON "fee_payments"("school_id", "receipt_number");

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "fee_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_fee_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
