-- CreateEnum
CREATE TYPE "audit_log_action" AS ENUM ('CREATE_CAMP', 'UPDATE_CAMP', 'DELETE_CAMP', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'CREATE_TRANSFER', 'APPROVE_TRANSFER_SOURCE', 'APPROVE_TRANSFER_TARGET', 'COMPLETE_TRANSFER', 'REJECT_TRANSFER', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "audit_log_target_type" AS ENUM ('users', 'camps', 'camp_transfers');

-- DropForeignKey
ALTER TABLE "admission_requests" DROP CONSTRAINT IF EXISTS "admission_requests_camp_id_fkey";
ALTER TABLE "admission_requests" DROP CONSTRAINT IF EXISTS "admission_requests_reviewed_by_fkey";
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_camp_id_fkey";
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_user_id_fkey";
ALTER TABLE "camp_transfer_item" DROP CONSTRAINT IF EXISTS "camp_transfer_item_camp_transfer_id_fkey";
ALTER TABLE "camp_transfer_item" DROP CONSTRAINT IF EXISTS "camp_transfer_item_person_id_fkey";
ALTER TABLE "camp_transfer_item" DROP CONSTRAINT IF EXISTS "camp_transfer_item_resource_type_id_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_approved_by_source_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_approved_by_target_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_leader_person_id_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_requested_by_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_requesting_camp_fkey";
ALTER TABLE "camp_transfers" DROP CONSTRAINT IF EXISTS "camp_transfers_target_camp_fkey";
ALTER TABLE "contribution_overrides" DROP CONSTRAINT IF EXISTS "contribution_overrides_created_by_fkey";
ALTER TABLE "contribution_overrides" DROP CONSTRAINT IF EXISTS "contribution_overrides_person_id_fkey";
ALTER TABLE "contribution_overrides" DROP CONSTRAINT IF EXISTS "contribution_overrides_resource_type_id_fkey";
ALTER TABLE "expedition_allocated_resources" DROP CONSTRAINT IF EXISTS "expedition_allocated_resources_expedition_id_fkey";
ALTER TABLE "expedition_allocated_resources" DROP CONSTRAINT IF EXISTS "expedition_allocated_resources_resource_type_id_fkey";
ALTER TABLE "expedition_found_resources" DROP CONSTRAINT IF EXISTS "expedition_found_resources_expedition_id_fkey";
ALTER TABLE "expedition_found_resources" DROP CONSTRAINT IF EXISTS "expedition_found_resources_resource_type_id_fkey";
ALTER TABLE "expedition_members" DROP CONSTRAINT IF EXISTS "expedition_members_expedition_id_fkey";
ALTER TABLE "expedition_members" DROP CONSTRAINT IF EXISTS "expedition_members_person_id_fkey";
ALTER TABLE "expeditions" DROP CONSTRAINT IF EXISTS "expeditions_camp_id_fkey";
ALTER TABLE "expeditions" DROP CONSTRAINT IF EXISTS "expeditions_created_by_fkey";
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_camp_id_fkey";
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_resource_type_id_fkey";
ALTER TABLE "inventory_log" DROP CONSTRAINT IF EXISTS "inventory_log_camp_id_fkey";
ALTER TABLE "inventory_log" DROP CONSTRAINT IF EXISTS "inventory_log_logged_by_fkey";
ALTER TABLE "inventory_log" DROP CONSTRAINT IF EXISTS "inventory_log_resource_type_id_fkey";
ALTER TABLE "person_status_log" DROP CONSTRAINT IF EXISTS "person_status_log_changed_by_fkey";
ALTER TABLE "person_status_log" DROP CONSTRAINT IF EXISTS "person_status_log_person_id_fkey";
ALTER TABLE "persons" DROP CONSTRAINT IF EXISTS "persons_camp_id_fkey";
ALTER TABLE "persons" DROP CONSTRAINT IF EXISTS "persons_profession_id_fkey";
ALTER TABLE "profession_reassignment_log" DROP CONSTRAINT IF EXISTS "profession_reassignment_log_from_profession_id_fkey";
ALTER TABLE "profession_reassignment_log" DROP CONSTRAINT IF EXISTS "profession_reassignment_log_person_id_fkey";
ALTER TABLE "profession_reassignment_log" DROP CONSTRAINT IF EXISTS "profession_reassignment_log_to_profession_id_fkey";
ALTER TABLE "professions_resources_amounts" DROP CONSTRAINT IF EXISTS "professions_resources_amounts_profession_id_fkey";
ALTER TABLE "professions_resources_amounts" DROP CONSTRAINT IF EXISTS "professions_resources_amounts_resource_type_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "user_achievements_achievement_id_fkey";
ALTER TABLE "user_achievements" DROP CONSTRAINT IF EXISTS "user_achievements_user_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_camp_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "expedition_allocated_resources_expedition_id_idx";
DROP INDEX IF EXISTS "expedition_found_resources_expedition_id_idx";
DROP INDEX IF EXISTS "expedition_members_person_id_idx";
DROP INDEX IF EXISTS "inventory_camp_id_idx";
DROP INDEX IF EXISTS "professions_resources_amounts_professions_id_idx";
DROP INDEX IF EXISTS "role_permissions_role_id_idx";
DROP INDEX IF EXISTS "user_achievements_user_id_idx";

-- AlterTable
ALTER TABLE "admission_requests" ADD COLUMN "person_id" INTEGER,
ALTER COLUMN "photo_url" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "camp_id" DROP NOT NULL,
DROP COLUMN "action",
ADD COLUMN "action" "audit_log_action" NOT NULL,
DROP COLUMN "target_type",
ADD COLUMN "target_type" "audit_log_target_type" NOT NULL;

-- AlterTable
ALTER TABLE "contribution_overrides" ALTER COLUMN "created_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "inventory" ALTER COLUMN "last_updated" DROP DEFAULT;

-- AlterTable: use safe cast instead of drop+recreate
ALTER TABLE "person_status_log" ALTER COLUMN "changed_by" DROP NOT NULL;
ALTER TABLE "person_status_log" ALTER COLUMN "old_status" TYPE "persons_status" USING "old_status"::persons_status;
ALTER TABLE "person_status_log" ALTER COLUMN "new_status" TYPE "persons_status" USING "new_status"::persons_status;

-- CreateIndex
CREATE INDEX "admission_requests_ai_profession_id_idx" ON "admission_requests"("ai_profession_id");
CREATE INDEX "admission_requests_person_id_idx" ON "admission_requests"("person_id");
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_ai_profession_id_fkey" FOREIGN KEY ("ai_profession_id") REFERENCES "professions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_camp_transfer_id_fkey" FOREIGN KEY ("camp_transfer_id") REFERENCES "camp_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_approved_by_source_fkey" FOREIGN KEY ("approved_by_source") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_approved_by_target_fkey" FOREIGN KEY ("approved_by_target") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_requesting_camp_fkey" FOREIGN KEY ("requesting_camp") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_target_camp_fkey" FOREIGN KEY ("target_camp") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_leader_person_id_fkey" FOREIGN KEY ("leader_person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expedition_allocated_resources" ADD CONSTRAINT "expedition_allocated_resources_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_allocated_resources" ADD CONSTRAINT "expedition_allocated_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expedition_found_resources" ADD CONSTRAINT "expedition_found_resources_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_found_resources" ADD CONSTRAINT "expedition_found_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expedition_members" ADD CONSTRAINT "expedition_members_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expedition_members" ADD CONSTRAINT "expedition_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "person_status_log" ADD CONSTRAINT "person_status_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "person_status_log" ADD CONSTRAINT "person_status_log_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "persons" ADD CONSTRAINT "persons_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "persons" ADD CONSTRAINT "persons_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_from_profession_id_fkey" FOREIGN KEY ("from_profession_id") REFERENCES "professions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_to_profession_id_fkey" FOREIGN KEY ("to_profession_id") REFERENCES "professions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professions_resources_amounts" ADD CONSTRAINT "professions_resources_amounts_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "professions_resources_amounts" ADD CONSTRAINT "professions_resources_amounts_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
