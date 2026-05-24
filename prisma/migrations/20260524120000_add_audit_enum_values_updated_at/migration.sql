-- Remove DEFAULT now() from updated_at columns (Prisma @updatedAt handles this at app level)
ALTER TABLE "achievements" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "admission_requests" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "camp_transfer_item" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "camp_transfers" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "camps" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "contribution_overrides" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "expeditions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "permissions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "persons" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "profession_reassignment_log" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "professions" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "resource_type" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Fix camp_transfer_item.quantity: schema says NOT NULL DEFAULT 0.00
ALTER TABLE "camp_transfer_item" ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0.00;

-- Fix inventory_log.quantity_change: remove DEFAULT 0
ALTER TABLE "inventory_log" ALTER COLUMN "quantity_change" DROP DEFAULT;
