-- CreateEnum
CREATE TYPE "AdvanceAllocationStatus" AS ENUM ('ALLOCATED', 'RECOVERED', 'RELEASED');

-- CreateTable
CREATE TABLE "staff_advance_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "staff_advance_id" UUID NOT NULL,
    "monthly_payroll_id" UUID NOT NULL,
    "salary_payment_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "AdvanceAllocationStatus" NOT NULL DEFAULT 'ALLOCATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_advance_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_advance_allocations_school_id_staff_id_idx" ON "staff_advance_allocations"("school_id", "staff_id");

-- CreateIndex
CREATE INDEX "staff_advance_allocations_monthly_payroll_id_idx" ON "staff_advance_allocations"("monthly_payroll_id");

-- CreateIndex
CREATE INDEX "staff_advance_allocations_salary_payment_id_idx" ON "staff_advance_allocations"("salary_payment_id");

-- AddForeignKey
ALTER TABLE "staff_advance_allocations" ADD CONSTRAINT "staff_advance_allocations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advance_allocations" ADD CONSTRAINT "staff_advance_allocations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advance_allocations" ADD CONSTRAINT "staff_advance_allocations_staff_advance_id_fkey" FOREIGN KEY ("staff_advance_id") REFERENCES "staff_advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advance_allocations" ADD CONSTRAINT "staff_advance_allocations_monthly_payroll_id_fkey" FOREIGN KEY ("monthly_payroll_id") REFERENCES "monthly_payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_advance_allocations" ADD CONSTRAINT "staff_advance_allocations_salary_payment_id_fkey" FOREIGN KEY ("salary_payment_id") REFERENCES "salary_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
