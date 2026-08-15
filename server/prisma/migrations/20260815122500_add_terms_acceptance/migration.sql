-- CreateTable
CREATE TABLE IF NOT EXISTS "terms_acceptances" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "school_id" UUID,
    "terms_version" TEXT NOT NULL,
    "privacy_policy_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "terms_acceptances_school_id_idx" ON "terms_acceptances"("school_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "terms_acceptances_user_id_idx" ON "terms_acceptances"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "terms_acceptances_terms_version_idx" ON "terms_acceptances"("terms_version");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'terms_acceptances_school_id_fkey'
    ) THEN
        ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'terms_acceptances_user_id_fkey'
    ) THEN
        ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
