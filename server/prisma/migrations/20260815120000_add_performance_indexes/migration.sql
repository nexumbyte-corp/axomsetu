-- CreateIndex
CREATE INDEX IF NOT EXISTS "students_school_id_phone_idx" ON "students"("school_id", "phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_enrollments_school_id_class_id_status_idx" ON "student_enrollments"("school_id", "class_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_enrollments_school_id_academic_year_id_class_id_status_idx" ON "student_enrollments"("school_id", "academic_year_id", "class_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_fee_charges_school_id_student_enrollment_id_status_idx" ON "student_fee_charges"("school_id", "student_enrollment_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_fee_charges_school_id_fee_type_id_status_idx" ON "student_fee_charges"("school_id", "fee_type_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fee_payments_school_id_status_payment_date_idx" ON "fee_payments"("school_id", "status", "payment_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fee_payments_school_id_payment_mode_payment_date_idx" ON "fee_payments"("school_id", "payment_mode", "payment_date");
