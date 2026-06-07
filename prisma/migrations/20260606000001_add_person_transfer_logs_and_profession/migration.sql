-- Add required_profession_id to camp_transfers for profession validation
ALTER TABLE "camp_transfers"
    ADD COLUMN "required_profession_id" INTEGER;

-- Add index for required_profession_id
CREATE INDEX "camp_transfers_required_profession_id_idx"
    ON "camp_transfers"("required_profession_id");

-- Add foreign key for required_profession_id
ALTER TABLE "camp_transfers"
    ADD CONSTRAINT "camp_transfers_required_profession_id_fkey"
    FOREIGN KEY ("required_profession_id") REFERENCES "professions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Create person_transfer_log table for tracking person movements between camps
CREATE TABLE "person_transfer_log" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "transfer_id" INTEGER NOT NULL,
    "origin_camp_id" INTEGER NOT NULL,
    "destination_camp_id" INTEGER NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "transferred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_transfer_log_pkey" PRIMARY KEY ("id")
);

-- Add indexes for person_transfer_log
CREATE INDEX "person_transfer_logs_person_id_idx"
    ON "person_transfer_log"("person_id");

CREATE INDEX "person_transfer_logs_transfer_id_idx"
    ON "person_transfer_log"("transfer_id");

CREATE INDEX "person_transfer_logs_origin_camp_id_idx"
    ON "person_transfer_log"("origin_camp_id");

CREATE INDEX "person_transfer_logs_destination_camp_id_idx"
    ON "person_transfer_log"("destination_camp_id");

-- Add foreign key constraints for person_transfer_log
ALTER TABLE "person_transfer_log"
    ADD CONSTRAINT "person_transfer_log_person_id_fkey"
    FOREIGN KEY ("person_id") REFERENCES "persons"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "person_transfer_log"
    ADD CONSTRAINT "person_transfer_log_transfer_id_fkey"
    FOREIGN KEY ("transfer_id") REFERENCES "camp_transfers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "person_transfer_log"
    ADD CONSTRAINT "person_transfer_log_origin_camp_id_fkey"
    FOREIGN KEY ("origin_camp_id") REFERENCES "camps"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "person_transfer_log"
    ADD CONSTRAINT "person_transfer_log_destination_camp_id_fkey"
    FOREIGN KEY ("destination_camp_id") REFERENCES "camps"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "person_transfer_log"
    ADD CONSTRAINT "person_transfer_log_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
