-- CreateTable
CREATE TABLE `achievements` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `icon_url` VARCHAR(500) NOT NULL,
    `trigger_rule` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admission_requests` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `applicant_name` VARCHAR(150) NOT NULL,
    `applicant_age` TINYINT UNSIGNED NULL,
    `applicant_skills` TEXT NULL,
    `health_notes` TEXT NULL,
    `background_notes` TEXT NULL,
    `photo_url` VARCHAR(255) NULL,
    `id_card_url` VARCHAR(500) NULL,
    `ai_decision` ENUM('ACCEPTED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `ai_reasoning` TEXT NULL,
    `ai_suggested_profession` VARCHAR(80) NULL,
    `reviewed_by` INTEGER UNSIGNED NULL,
    `final_decision` ENUM('ACCEPTED', 'REJECTED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `reviewed_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_admission_request_camp_idx`(`camp_id`),
    INDEX `fk_user_reviewd_by_idx`(`reviewed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `camp_transfer_item` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_transfer_id` INTEGER UNSIGNED NOT NULL,
    `item_type` ENUM('RESOURCE', 'PERSON') NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NULL,
    `person_id` INTEGER UNSIGNED NULL,
    `quantity` DECIMAL(10, 2) NULL,

    INDEX `fk_camp_transfer_id_idx`(`camp_transfer_id`),
    INDEX `fk_person_id_idx`(`person_id`),
    INDEX `fk_resource_type_id_idx`(`resource_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `camp_transfers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `requesting_camp` INTEGER UNSIGNED NOT NULL,
    `target_camp` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING', 'APPROVED_SOURCE', 'APPROVED_TARGET', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `type` ENUM('RESOURCE', 'PERSON', 'MIXED') NOT NULL,
    `notes` TEXT NULL,
    `requested_by` INTEGER UNSIGNED NOT NULL,
    `leader_person_id` INTEGER UNSIGNED NULL,
    `scheduled_delivery_date` DATETIME(0) NULL,
    `approved_by_source` INTEGER UNSIGNED NULL,
    `approved_by_target` INTEGER UNSIGNED NULL,
    `approved_source_at` DATETIME(0) NULL,
    `approved_target_at` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_approved_by_source_idx`(`approved_by_source`),
    INDEX `fk_approved_by_target_idx`(`approved_by_target`),
    INDEX `fk_requested_by_idx`(`requested_by`),
    INDEX `fk_requesting_camp_idx`(`requesting_camp`),
    INDEX `fk_target_camp_idx`(`target_camp`),
    INDEX `fk_transfer_leader_person_idx`(`leader_person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `camps` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(100) NULL,
    `status` ENUM('ACTIVE', 'ABANDONED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `name_UNIQUE`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contribution_overrides` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `person_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `start_date` DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_date` DATE NULL,
    `created_by` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(8, 2) NOT NULL,

    INDEX `fk_created_by_idx`(`created_by`),
    INDEX `fk_person_id_idx`(`person_id`),
    INDEX `fk_resource_type__id_idx`(`resource_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expedition_allocated_resources` (
    `expedition_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `fk_expedition_id_idx`(`expedition_id`),
    INDEX `fk_resource_type_id_idx`(`resource_type_id`),
    PRIMARY KEY (`expedition_id`, `resource_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expedition_found_resources` (
    `expedition_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `fk_expedition_id_idx`(`expedition_id`),
    INDEX `fk_resource_type_id_idx`(`resource_type_id`),
    PRIMARY KEY (`expedition_id`, `resource_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expedition_members` (
    `expedition_id` INTEGER UNSIGNED NOT NULL,
    `person_id` INTEGER UNSIGNED NOT NULL,

    INDEX `fk_expedition_id_idx`(`expedition_id`),
    INDEX `fk_person_id_idx`(`person_id`),
    PRIMARY KEY (`person_id`, `expedition_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expeditions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `destination` VARCHAR(255) NOT NULL,
    `status` ENUM('PLANNED', 'ONGOING', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `created_by` INTEGER UNSIGNED NOT NULL,
    `departure_date` DATE NOT NULL,
    `expected_return_date` DATE NOT NULL,
    `actual_return_date` DATE NULL,
    `max_return_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_camp_id_idx`(`camp_id`),
    INDEX `fk_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `last_updated` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_camp_idx`(`camp_id`),
    INDEX `fk_resource_type_idx`(`resource_type_id`),
    UNIQUE INDEX `uq_camp_resource`(`camp_id`, `resource_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_log` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `logged_by` INTEGER UNSIGNED NULL,
    `log_type` ENUM('DAILY_GAIN', 'DAILY_RATION', 'MANUAL_IN', 'MANUAL_OUT', 'EXPEDITION_OUT', 'EXPEDITION_IN', 'TRANSFER_OUT', 'TRANSFER_IN') NOT NULL,
    `delta` DECIMAL(12, 2) NOT NULL,
    `logged_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `description` VARCHAR(255) NULL,

    INDEX `fk_camp__id_idx`(`camp_id`),
    INDEX `fk_logged_by_idx`(`logged_by`),
    INDEX `fk_resource_id_idx`(`resource_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `person_status_log` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `person_id` INTEGER UNSIGNED NOT NULL,
    `old_status` VARCHAR(20) NOT NULL,
    `new_status` VARCHAR(45) NOT NULL,
    `reason` TEXT NULL,
    `changed_by` INTEGER UNSIGNED NOT NULL,
    `changed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_changed_by_idx`(`changed_by`),
    INDEX `fk_person_id_idx`(`person_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `persons` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `profession_id` INTEGER UNSIGNED NOT NULL,
    `identification_code` VARCHAR(20) NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `age` TINYINT UNSIGNED NULL,
    `blood_type` VARCHAR(5) NULL,
    `skills_summary` TEXT NULL,
    `photo_url` VARCHAR(500) NULL,
    `status` ENUM('SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD') NOT NULL DEFAULT 'HEALTHY',
    `admitted_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `identification_code_UNIQUE`(`identification_code`),
    INDEX `fk_person_camp__id_idx`(`camp_id`),
    INDEX `fk_persons_profession_id_idx`(`profession_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profession_reassignment_log` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `person_id` INTEGER UNSIGNED NOT NULL,
    `from_profession_id` INTEGER UNSIGNED NOT NULL,
    `to_profession_id` INTEGER UNSIGNED NOT NULL,
    `reason` TEXT NULL,
    `start_date` DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `end_date` DATE NULL,

    INDEX `fk_from_profession_id_idx`(`from_profession_id`),
    INDEX `fk_person_id_idx`(`person_id`),
    INDEX `fk_to_profession_id_idx`(`to_profession_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professions_resources_amounts` (
    `professions_id` INTEGER UNSIGNED NOT NULL,
    `resource_type_id` INTEGER UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,

    INDEX `fk_profession_type_id_idx`(`professions_id`),
    INDEX `fk_resource_type_id_idx`(`resource_type_id`),
    PRIMARY KEY (`professions_id`, `resource_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resource_type` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `daily_ration` DECIMAL(8, 2) NOT NULL,
    `minimum_stock` DECIMAL(10, 2) NOT NULL,
    `auto_daily` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(255) NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` TINYINT NOT NULL DEFAULT 1,
    `version` VARCHAR(20) NULL,
    `server_time` DATETIME(0) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_achievements` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER UNSIGNED NOT NULL,
    `achievement_id` INTEGER UNSIGNED NOT NULL,
    `earned_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_achivement_id_idx`(`achievement_id`),
    INDEX `fk_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `camp_id` INTEGER UNSIGNED NOT NULL,
    `role_id` INTEGER UNSIGNED NOT NULL,
    `username` VARCHAR(60) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_activity` TIMESTAMP(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username_UNIQUE`(`username`),
    INDEX `fk_users_camp_idx`(`camp_id`),
    INDEX `fk_users_role_idx`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admission_requests` ADD CONSTRAINT `fk_admission_requests_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `admission_requests` ADD CONSTRAINT `fk_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfer_item` ADD CONSTRAINT `fk_camp_transfer_id` FOREIGN KEY (`camp_transfer_id`) REFERENCES `camp_transfers`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfer_item` ADD CONSTRAINT `fk_transfer_item_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfer_item` ADD CONSTRAINT `fk_transfer_item_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_approved_by_source` FOREIGN KEY (`approved_by_source`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_approved_by_target` FOREIGN KEY (`approved_by_target`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_requesting_camp` FOREIGN KEY (`requesting_camp`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_target_camp` FOREIGN KEY (`target_camp`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `camp_transfers` ADD CONSTRAINT `fk_transfer_leader_person` FOREIGN KEY (`leader_person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contribution_overrides` ADD CONSTRAINT `fk_contribution_overrides_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contribution_overrides` ADD CONSTRAINT `fk_contribution_overrides_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contribution_overrides` ADD CONSTRAINT `fk_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_allocated_resources` ADD CONSTRAINT `fk_exp_allocated_expedition_id` FOREIGN KEY (`expedition_id`) REFERENCES `expeditions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_allocated_resources` ADD CONSTRAINT `fk_exp_allocated_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_found_resources` ADD CONSTRAINT `fk_exp_found_expedition_id` FOREIGN KEY (`expedition_id`) REFERENCES `expeditions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_found_resources` ADD CONSTRAINT `fk_exp_found_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_members` ADD CONSTRAINT `fk_exp_members_expedition_id` FOREIGN KEY (`expedition_id`) REFERENCES `expeditions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expedition_members` ADD CONSTRAINT `fk_exp_members_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expeditions` ADD CONSTRAINT `fk_expeditions_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expeditions` ADD CONSTRAINT `fk_expeditions_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `fk_inventory_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_log` ADD CONSTRAINT `fk_inventory_log_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_log` ADD CONSTRAINT `fk_inventory_log_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `inventory_log` ADD CONSTRAINT `fk_logged_by` FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `person_status_log` ADD CONSTRAINT `fk_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `person_status_log` ADD CONSTRAINT `fk_person_status_log_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `fk_persons_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `persons` ADD CONSTRAINT `fk_persons_profession_id` FOREIGN KEY (`profession_id`) REFERENCES `professions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profession_reassignment_log` ADD CONSTRAINT `fk_from_profession_id` FOREIGN KEY (`from_profession_id`) REFERENCES `professions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profession_reassignment_log` ADD CONSTRAINT `fk_reassignment_log_person_id` FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `profession_reassignment_log` ADD CONSTRAINT `fk_to_profession_id` FOREIGN KEY (`to_profession_id`) REFERENCES `professions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professions_resources_amounts` ADD CONSTRAINT `fk_prof_res_amounts_profession_id` FOREIGN KEY (`professions_id`) REFERENCES `professions`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `professions_resources_amounts` ADD CONSTRAINT `fk_prof_res_amounts_resource_type_id` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `fk_achivement_id` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `fk_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_camp_id` FOREIGN KEY (`camp_id`) REFERENCES `camps`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

