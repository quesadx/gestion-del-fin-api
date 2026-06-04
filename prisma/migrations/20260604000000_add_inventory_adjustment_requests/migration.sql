-- Create enum for inventory adjustment request status
CREATE TYPE "inventory_adjustment_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create inventory_adjustment_request table
CREATE TABLE "inventory_adjustment_request" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "status" "inventory_adjustment_request_status" NOT NULL DEFAULT 'PENDING',
    "adjustment_type" "inventory_log_log_type" NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(255),
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_adjustment_request_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "inventory_adjustment_request" ADD CONSTRAINT "inventory_adjustment_request_camp_id_fkey"
    FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_adjustment_request" ADD CONSTRAINT "inventory_adjustment_request_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_adjustment_request" ADD CONSTRAINT "inventory_adjustment_request_reviewed_by_fkey"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_adjustment_request" ADD CONSTRAINT "inventory_adjustment_request_resource_type_id_fkey"
    FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "inventory_adjustment_requests_camp_id_idx" ON "inventory_adjustment_request"("camp_id");
CREATE INDEX "inventory_adjustment_requests_created_by_idx" ON "inventory_adjustment_request"("created_by");
CREATE INDEX "inventory_adjustment_requests_reviewed_by_idx" ON "inventory_adjustment_request"("reviewed_by");
CREATE INDEX "inventory_adjustment_requests_status_idx" ON "inventory_adjustment_request"("status");

-- Add new values to audit_log_action enum
ALTER TYPE "audit_log_action" ADD VALUE 'CREATE_INVENTORY_ADJUSTMENT_REQUEST';
ALTER TYPE "audit_log_action" ADD VALUE 'REVIEW_INVENTORY_ADJUSTMENT_REQUEST';

-- Add new value to audit_log_target_type enum
ALTER TYPE "audit_log_target_type" ADD VALUE 'inventory_adjustment_requests';
