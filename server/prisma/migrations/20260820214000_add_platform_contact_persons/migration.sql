-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_contact_persons" (
    "id" UUID NOT NULL,
    "platform_setting_id" UUID,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "platform_contact_persons_platform_setting_id_idx" ON "platform_contact_persons"("platform_setting_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'platform_contact_persons_platform_setting_id_fkey'
    ) THEN
        ALTER TABLE "platform_contact_persons" ADD CONSTRAINT "platform_contact_persons_platform_setting_id_fkey" FOREIGN KEY ("platform_setting_id") REFERENCES "platform_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
