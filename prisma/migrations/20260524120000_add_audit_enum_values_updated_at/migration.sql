-- AlterEnum
ALTER TYPE "audit_log_action" ADD VALUE 'CREATE_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE 'REVIEW_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE 'OVERRIDE_ADMISSION';
ALTER TYPE "audit_log_action" ADD VALUE 'CREATE_EXPEDITION';
ALTER TYPE "audit_log_action" ADD VALUE 'UPDATE_EXPEDITION_STATUS';
ALTER TYPE "audit_log_action" ADD VALUE 'CANCEL_EXPEDITION';
ALTER TYPE "audit_log_action" ADD VALUE 'CREATE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE 'UPDATE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE 'DELETE_PERSON';
ALTER TYPE "audit_log_action" ADD VALUE 'CHANGE_PERSON_STATUS';
ALTER TYPE "audit_log_action" ADD VALUE 'REASSIGN_PROFESSION';
ALTER TYPE "audit_log_action" ADD VALUE 'CREATE_OVERRIDE';
ALTER TYPE "audit_log_action" ADD VALUE 'MANUAL_INVENTORY_ADJUST';

-- AlterEnum
ALTER TYPE "audit_log_target_type" ADD VALUE 'admission_requests';
ALTER TYPE "audit_log_target_type" ADD VALUE 'expeditions';
ALTER TYPE "audit_log_target_type" ADD VALUE 'people';
ALTER TYPE "audit_log_target_type" ADD VALUE 'inventory_logs';

-- DropForeignKey
ALTER TABLE "professions_resources_amounts" DROP CONSTRAINT IF EXISTS "professions_resources_amounts_professions_id_fkey";

-- AlterTable
ALTER TABLE "achievements" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "admission_requests" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "camp_transfer_item" ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0.00,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "camp_transfers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "camps" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contribution_overrides" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expeditions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory_log" ALTER COLUMN "quantity_change" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "persons" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "profession_reassignment_log" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "professions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resource_type" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_config" DROP COLUMN "server_time";
