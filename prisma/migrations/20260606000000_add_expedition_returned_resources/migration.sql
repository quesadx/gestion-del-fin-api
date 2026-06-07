-- Create expedition_returned_resources table to track allocated resources
-- that returned from expeditions (sobrantes), separate from found resources.
CREATE TABLE "expedition_returned_resources" (
    "expedition_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expedition_returned_resources_pkey" PRIMARY KEY ("expedition_id", "resource_type_id")
);

-- Add foreign key constraints
ALTER TABLE "expedition_returned_resources" ADD CONSTRAINT "expedition_returned_resources_expedition_id_fkey"
    FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expedition_returned_resources" ADD CONSTRAINT "expedition_returned_resources_resource_type_id_fkey"
    FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "expedition_returned_resources_resource_type_id_idx"
    ON "expedition_returned_resources"("resource_type_id");
