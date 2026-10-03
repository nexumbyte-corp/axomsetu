-- CreateIndex
CREATE INDEX IF NOT EXISTS "staff_school_id_status_idx" ON "staff"("school_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "staff_school_id_role_idx" ON "staff"("school_id", "role");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "staff_advances_school_id_staff_id_idx" ON "staff_advances"("school_id", "staff_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "monthly_payrolls_school_id_academic_year_id_month_year_idx" ON "monthly_payrolls"("school_id", "academic_year_id", "month", "year");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_payments_school_id_payment_date_idx" ON "salary_payments"("school_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salary_payments_school_id_academic_year_id_payment_date_idx" ON "salary_payments"("school_id", "academic_year_id", "payment_date" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscription_plans_is_active_is_trial_display_order_idx" ON "subscription_plans"("is_active", "is_trial", "display_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "school_subscriptions_school_id_created_at_idx" ON "school_subscriptions"("school_id", "created_at" DESC);
