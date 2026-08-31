-- CreateTable
CREATE TABLE "student_transfer_histories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "student_enrollment_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "from_medium_id" UUID NOT NULL,
    "to_medium_id" UUID NOT NULL,
    "from_stream_id" UUID,
    "to_stream_id" UUID,
    "transfer_date" DATE NOT NULL,
    "fee_difference" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additional_payable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_transfer_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_transfer_histories_school_id_idx" ON "student_transfer_histories"("school_id");

-- CreateIndex
CREATE INDEX "student_transfer_histories_student_id_idx" ON "student_transfer_histories"("student_id");

-- CreateIndex
CREATE INDEX "student_transfer_histories_student_enrollment_id_idx" ON "student_transfer_histories"("student_enrollment_id");

-- CreateIndex
CREATE INDEX "student_transfer_histories_academic_year_id_idx" ON "student_transfer_histories"("academic_year_id");

-- CreateIndex
CREATE INDEX "student_transfer_histories_school_id_student_id_transfer_date_idx" ON "student_transfer_histories"("school_id", "student_id", "transfer_date");

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_student_enrollment_id_fkey" FOREIGN KEY ("student_enrollment_id") REFERENCES "student_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_from_medium_id_fkey" FOREIGN KEY ("from_medium_id") REFERENCES "mediums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_to_medium_id_fkey" FOREIGN KEY ("to_medium_id") REFERENCES "mediums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_from_stream_id_fkey" FOREIGN KEY ("from_stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_to_stream_id_fkey" FOREIGN KEY ("to_stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfer_histories" ADD CONSTRAINT "student_transfer_histories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
