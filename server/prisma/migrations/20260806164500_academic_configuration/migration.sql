-- AlterTable
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "has_stream" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "mediums" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "streams" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "student_enrollments" ALTER COLUMN "section_id" DROP NOT NULL;

-- Custom Partial Unique Index: Only one current academic year per school
CREATE UNIQUE INDEX IF NOT EXISTS "unique_current_academic_year_per_school" ON "academic_years" ("school_id") WHERE is_current = true;
