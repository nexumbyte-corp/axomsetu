-- CreateTable
CREATE TABLE IF NOT EXISTS "platform_settings" (
    "id" UUID NOT NULL,
    "platform_name" TEXT NOT NULL DEFAULT 'AxomSetu Platform',
    "contact_person_name" TEXT,
    "contact_role" TEXT,
    "support_email" TEXT,
    "support_phone" TEXT,
    "whatsapp_number" TEXT,
    "address" TEXT,
    "default_currency" TEXT NOT NULL DEFAULT 'INR',
    "default_trial_days" INTEGER NOT NULL DEFAULT 60,
    "allow_self_registration" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
