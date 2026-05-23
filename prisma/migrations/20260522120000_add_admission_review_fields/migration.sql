ALTER TABLE "admission_requests" ADD COLUMN "ai_confidence" DOUBLE PRECISION;
ALTER TABLE "admission_requests" ADD COLUMN "corrected_profession_id" INTEGER;
ALTER TABLE "admission_requests" ADD COLUMN "correction_reason" VARCHAR(255);

CREATE INDEX "admission_requests_corrected_profession_id_idx" ON "admission_requests"("corrected_profession_id");

ALTER TABLE "admission_requests"
  ADD CONSTRAINT "admission_requests_corrected_profession_id_fkey"
  FOREIGN KEY ("corrected_profession_id")
  REFERENCES "professions"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
