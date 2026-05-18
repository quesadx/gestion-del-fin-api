-- CreateIndex
CREATE INDEX "admission_requests_created_at_idx" ON "admission_requests"("created_at");

-- CreateIndex
CREATE INDEX "expeditions_departure_date_idx" ON "expeditions"("departure_date");

-- CreateIndex
CREATE INDEX "expeditions_expected_return_date_idx" ON "expeditions"("expected_return_date");

-- CreateIndex
CREATE INDEX "inventory_logs_logged_at_idx" ON "inventory_log"("logged_at");

-- RenameIndex
ALTER INDEX "camp_transfer_item_camp_transfer_id_idx" RENAME TO "camp_transfer_items_camp_transfer_id_idx";

-- RenameIndex
ALTER INDEX "camp_transfer_item_person_id_idx" RENAME TO "camp_transfer_items_person_id_idx";

-- RenameIndex
ALTER INDEX "camp_transfer_item_resource_type_id_idx" RENAME TO "camp_transfer_items_resource_type_id_idx";

-- RenameIndex
ALTER INDEX "inventory_resource_type_id_idx" RENAME TO "inventories_resource_type_id_idx";

-- RenameIndex
ALTER INDEX "inventory_log_camp_id_idx" RENAME TO "inventory_logs_camp_id_idx";

-- RenameIndex
ALTER INDEX "inventory_log_logged_by_idx" RENAME TO "inventory_logs_logged_by_idx";

-- RenameIndex
ALTER INDEX "inventory_log_resource_type_id_idx" RENAME TO "inventory_logs_resource_type_id_idx";

-- RenameIndex
ALTER INDEX "person_status_log_changed_by_idx" RENAME TO "person_status_logs_changed_by_idx";

-- RenameIndex
ALTER INDEX "person_status_log_person_id_idx" RENAME TO "person_status_logs_person_id_idx";

-- RenameIndex
ALTER INDEX "persons_camp_id_idx" RENAME TO "people_camp_id_idx";

-- RenameIndex
ALTER INDEX "persons_profession_id_idx" RENAME TO "people_profession_id_idx";

-- RenameIndex
ALTER INDEX "profession_reassignment_log_from_profession_id_idx" RENAME TO "profession_reassignment_logs_from_profession_id_idx";

-- RenameIndex
ALTER INDEX "profession_reassignment_log_person_id_idx" RENAME TO "profession_reassignment_logs_person_id_idx";

-- RenameIndex
ALTER INDEX "profession_reassignment_log_to_profession_id_idx" RENAME TO "profession_reassignment_logs_to_profession_id_idx";

-- RenameIndex
ALTER INDEX "audit_log_user_id_idx" RENAME TO "audit_logs_user_id_idx";

-- RenameIndex
ALTER INDEX "audit_log_camp_id_idx" RENAME TO "audit_logs_camp_id_idx";

-- RenameIndex
ALTER INDEX "audit_log_created_at_idx" RENAME TO "audit_logs_created_at_idx";
