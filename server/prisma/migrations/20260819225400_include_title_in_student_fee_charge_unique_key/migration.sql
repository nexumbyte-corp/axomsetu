-- DropIndex
DROP INDEX IF EXISTS "student_fee_charges_school_id_academic_year_id_student_id_s_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "student_fee_charges_school_id_academic_year_id_student_id_student_enrollment_id_fee_type_id_month_title_key" ON "student_fee_charges"("school_id", "academic_year_id", "student_id", "student_enrollment_id", "fee_type_id", "month", "title");
