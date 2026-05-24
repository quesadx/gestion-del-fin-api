-- AlterEnum
-- Audit log actions for admissions, expeditions, people, and inventory
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CREATE_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'REVIEW_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'OVERRIDE_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CREATE_EXPEDITION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'UPDATE_EXPEDITION_STATUS';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CANCEL_EXPEDITION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CREATE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'UPDATE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'DELETE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CHANGE_PERSON_STATUS';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'REASSIGN_PROFESSION';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'CREATE_OVERRIDE';
ALTER TYPE "audit_log_action" ADD VALUE IF NOT EXISTS 'MANUAL_INVENTORY_ADJUST';

-- AlterEnum
ALTER TYPE "audit_log_target_type" ADD VALUE IF NOT EXISTS 'admission_requests';
ALTER TYPE "audit_log_target_type" ADD VALUE IF NOT EXISTS 'expeditions';
ALTER TYPE "audit_log_target_type" ADD VALUE IF NOT EXISTS 'people';
ALTER TYPE "audit_log_target_type" ADD VALUE IF NOT EXISTS 'inventory_logs';

-- AddDropFK
ALTER TABLE "professions_resources_amounts" DROP CONSTRAINT IF EXISTS "professions_resources_amounts_professions_id_fkey";

-- Add @updatedAt to camps (was missing)
ALTER TABLE "camps" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Add @updatedAt to admission_requests (was missing)
ALTER TABLE "admission_requests" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Add @updatedAt to camp_transfers (was missing)
ALTER TABLE "camp_transfers" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Add @updatedAt to expeditions (was missing)
ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Fix contribution_overrides.amount Decimal(8,2) -> Decimal(12,2)
ALTER TABLE "contribution_overrides" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- Remove dead server_time column from system_config
ALTER TABLE "system_config" DROP COLUMN IF EXISTS "server_time";
