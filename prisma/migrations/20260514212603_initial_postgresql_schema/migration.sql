-- CreateEnum
CREATE TYPE "camp_transfer_item_item_type" AS ENUM ('RESOURCE', 'PERSON');

-- CreateEnum
CREATE TYPE "expeditions_status" AS ENUM ('PLANNED', 'ONGOING', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "camp_transfers_status" AS ENUM ('PENDING', 'APPROVED_SOURCE', 'APPROVED_TARGET', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "camps_status" AS ENUM ('ACTIVE', 'ABANDONED');

-- CreateEnum
CREATE TYPE "camp_transfers_type" AS ENUM ('RESOURCE', 'PERSON', 'MIXED');

-- CreateEnum
CREATE TYPE "inventory_log_log_type" AS ENUM ('DAILY_GAIN', 'DAILY_RATION', 'MANUAL_IN', 'MANUAL_OUT', 'EXPEDITION_OUT', 'EXPEDITION_IN', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "persons_status" AS ENUM ('SICK', 'HEALTHY', 'INJURED', 'AWAY', 'DEAD');

-- CreateEnum
CREATE TYPE "admission_requests_ai_decision" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "admission_requests_final_decision" AS ENUM ('ACCEPTED', 'REJECTED', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "icon_url" VARCHAR(500) NOT NULL,
    "trigger_rule" VARCHAR(100) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_requests" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "applicant_name" VARCHAR(150) NOT NULL,
    "applicant_age" INTEGER,
    "applicant_skills" TEXT,
    "health_notes" TEXT,
    "background_notes" TEXT,
    "photo_url" VARCHAR(255),
    "id_card_url" VARCHAR(500),
    "ai_decision" "admission_requests_ai_decision" NOT NULL DEFAULT 'PENDING',
    "ai_reasoning" TEXT,
    "ai_suggested_profession" VARCHAR(80),
    "ai_profession_id" INTEGER,
    "reviewed_by" INTEGER,
    "final_decision" "admission_requests_final_decision" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_transfer_item" (
    "id" SERIAL NOT NULL,
    "camp_transfer_id" INTEGER NOT NULL,
    "item_type" "camp_transfer_item_item_type" NOT NULL,
    "resource_type_id" INTEGER,
    "person_id" INTEGER,
    "quantity" DECIMAL(10,2),

    CONSTRAINT "camp_transfer_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camp_transfers" (
    "id" SERIAL NOT NULL,
    "requesting_camp" INTEGER NOT NULL,
    "target_camp" INTEGER NOT NULL,
    "status" "camp_transfers_status" NOT NULL DEFAULT 'PENDING',
    "type" "camp_transfers_type" NOT NULL,
    "notes" TEXT,
    "requested_by" INTEGER NOT NULL,
    "leader_person_id" INTEGER,
    "scheduled_delivery_date" TIMESTAMP(3),
    "approved_by_source" INTEGER,
    "approved_by_target" INTEGER,
    "approved_source_at" TIMESTAMP(3),
    "approved_target_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camp_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camps" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location" VARCHAR(100),
    "status" "camps_status" NOT NULL DEFAULT 'ACTIVE',
    "ai_context_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_overrides" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATE,
    "created_by" INTEGER NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "contribution_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedition_allocated_resources" (
    "expedition_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "expedition_allocated_resources_pkey" PRIMARY KEY ("expedition_id","resource_type_id")
);

-- CreateTable
CREATE TABLE "expedition_found_resources" (
    "expedition_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "expedition_found_resources_pkey" PRIMARY KEY ("expedition_id","resource_type_id")
);

-- CreateTable
CREATE TABLE "expedition_members" (
    "expedition_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,

    CONSTRAINT "expedition_members_pkey" PRIMARY KEY ("person_id","expedition_id")
);

-- CreateTable
CREATE TABLE "expeditions" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "destination" VARCHAR(255) NOT NULL,
    "status" "expeditions_status" NOT NULL DEFAULT 'PLANNED',
    "created_by" INTEGER NOT NULL,
    "departure_date" DATE NOT NULL,
    "expected_return_date" DATE NOT NULL,
    "actual_return_date" DATE,
    "max_return_date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expeditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_log" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "logged_by" INTEGER,
    "log_type" "inventory_log_log_type" NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" VARCHAR(255),

    CONSTRAINT "inventory_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_status_log" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "old_status" VARCHAR(20) NOT NULL,
    "new_status" VARCHAR(45) NOT NULL,
    "reason" TEXT,
    "changed_by" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_status_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "profession_id" INTEGER NOT NULL,
    "identification_code" VARCHAR(20),
    "full_name" VARCHAR(150) NOT NULL,
    "age" INTEGER,
    "blood_type" VARCHAR(5),
    "skills_summary" TEXT,
    "photo_url" VARCHAR(500),
    "status" "persons_status" NOT NULL DEFAULT 'HEALTHY',
    "admitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profession_reassignment_log" (
    "id" SERIAL NOT NULL,
    "person_id" INTEGER NOT NULL,
    "from_profession_id" INTEGER NOT NULL,
    "to_profession_id" INTEGER NOT NULL,
    "reason" TEXT,
    "start_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" DATE,

    CONSTRAINT "profession_reassignment_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,

    CONSTRAINT "professions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professions_resources_amounts" (
    "professions_id" INTEGER NOT NULL,
    "resource_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "professions_resources_amounts_pkey" PRIMARY KEY ("professions_id","resource_type_id")
);

-- CreateTable
CREATE TABLE "resource_type" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "daily_ration" DECIMAL(8,2) NOT NULL,
    "minimum_stock" DECIMAL(10,2) NOT NULL,
    "auto_daily" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "resource_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" VARCHAR(20),
    "server_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "camp_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "username" VARCHAR(60) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_unique" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "admission_requests_camp_id_idx" ON "admission_requests"("camp_id");

-- CreateIndex
CREATE INDEX "admission_requests_reviewed_by_idx" ON "admission_requests"("reviewed_by");

-- CreateIndex
CREATE INDEX "camp_transfer_item_camp_transfer_id_idx" ON "camp_transfer_item"("camp_transfer_id");

-- CreateIndex
CREATE INDEX "camp_transfer_item_person_id_idx" ON "camp_transfer_item"("person_id");

-- CreateIndex
CREATE INDEX "camp_transfer_item_resource_type_id_idx" ON "camp_transfer_item"("resource_type_id");

-- CreateIndex
CREATE INDEX "camp_transfers_approved_by_source_idx" ON "camp_transfers"("approved_by_source");

-- CreateIndex
CREATE INDEX "camp_transfers_approved_by_target_idx" ON "camp_transfers"("approved_by_target");

-- CreateIndex
CREATE INDEX "camp_transfers_requested_by_idx" ON "camp_transfers"("requested_by");

-- CreateIndex
CREATE INDEX "camp_transfers_requesting_camp_idx" ON "camp_transfers"("requesting_camp");

-- CreateIndex
CREATE INDEX "camp_transfers_target_camp_idx" ON "camp_transfers"("target_camp");

-- CreateIndex
CREATE INDEX "camp_transfers_leader_person_id_idx" ON "camp_transfers"("leader_person_id");

-- CreateIndex
CREATE UNIQUE INDEX "camps_name_unique" ON "camps"("name");

-- CreateIndex
CREATE INDEX "contribution_overrides_created_by_idx" ON "contribution_overrides"("created_by");

-- CreateIndex
CREATE INDEX "contribution_overrides_person_id_idx" ON "contribution_overrides"("person_id");

-- CreateIndex
CREATE INDEX "contribution_overrides_resource_type_id_idx" ON "contribution_overrides"("resource_type_id");

-- CreateIndex
CREATE INDEX "expedition_allocated_resources_expedition_id_idx" ON "expedition_allocated_resources"("expedition_id");

-- CreateIndex
CREATE INDEX "expedition_allocated_resources_resource_type_id_idx" ON "expedition_allocated_resources"("resource_type_id");

-- CreateIndex
CREATE INDEX "expedition_found_resources_expedition_id_idx" ON "expedition_found_resources"("expedition_id");

-- CreateIndex
CREATE INDEX "expedition_found_resources_resource_type_id_idx" ON "expedition_found_resources"("resource_type_id");

-- CreateIndex
CREATE INDEX "expedition_members_expedition_id_idx" ON "expedition_members"("expedition_id");

-- CreateIndex
CREATE INDEX "expedition_members_person_id_idx" ON "expedition_members"("person_id");

-- CreateIndex
CREATE INDEX "expeditions_camp_id_idx" ON "expeditions"("camp_id");

-- CreateIndex
CREATE INDEX "expeditions_created_by_idx" ON "expeditions"("created_by");

-- CreateIndex
CREATE INDEX "inventory_camp_id_idx" ON "inventory"("camp_id");

-- CreateIndex
CREATE INDEX "inventory_resource_type_id_idx" ON "inventory"("resource_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_camp_resource" ON "inventory"("camp_id", "resource_type_id");

-- CreateIndex
CREATE INDEX "inventory_log_camp_id_idx" ON "inventory_log"("camp_id");

-- CreateIndex
CREATE INDEX "inventory_log_logged_by_idx" ON "inventory_log"("logged_by");

-- CreateIndex
CREATE INDEX "inventory_log_resource_type_id_idx" ON "inventory_log"("resource_type_id");

-- CreateIndex
CREATE INDEX "person_status_log_changed_by_idx" ON "person_status_log"("changed_by");

-- CreateIndex
CREATE INDEX "person_status_log_person_id_idx" ON "person_status_log"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "identification_code_UNIQUE" ON "persons"("identification_code");

-- CreateIndex
CREATE INDEX "persons_camp_id_idx" ON "persons"("camp_id");

-- CreateIndex
CREATE INDEX "persons_profession_id_idx" ON "persons"("profession_id");

-- CreateIndex
CREATE INDEX "profession_reassignment_log_from_profession_id_idx" ON "profession_reassignment_log"("from_profession_id");

-- CreateIndex
CREATE INDEX "profession_reassignment_log_person_id_idx" ON "profession_reassignment_log"("person_id");

-- CreateIndex
CREATE INDEX "profession_reassignment_log_to_profession_id_idx" ON "profession_reassignment_log"("to_profession_id");

-- CreateIndex
CREATE UNIQUE INDEX "professions_name_unique" ON "professions"("name");

-- CreateIndex
CREATE INDEX "professions_resources_amounts_professions_id_idx" ON "professions_resources_amounts"("professions_id");

-- CreateIndex
CREATE INDEX "professions_resources_amounts_resource_type_id_idx" ON "professions_resources_amounts"("resource_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_type_name_unique" ON "resource_type"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "roles"("name");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "username_UNIQUE" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_camp_id_idx" ON "users"("camp_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission_requests" ADD CONSTRAINT "admission_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_camp_transfer_id_fkey" FOREIGN KEY ("camp_transfer_id") REFERENCES "camp_transfers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfer_item" ADD CONSTRAINT "camp_transfer_item_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_approved_by_source_fkey" FOREIGN KEY ("approved_by_source") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_approved_by_target_fkey" FOREIGN KEY ("approved_by_target") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_requesting_camp_fkey" FOREIGN KEY ("requesting_camp") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_target_camp_fkey" FOREIGN KEY ("target_camp") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "camp_transfers" ADD CONSTRAINT "camp_transfers_leader_person_id_fkey" FOREIGN KEY ("leader_person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contribution_overrides" ADD CONSTRAINT "contribution_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_allocated_resources" ADD CONSTRAINT "expedition_allocated_resources_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_allocated_resources" ADD CONSTRAINT "expedition_allocated_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_found_resources" ADD CONSTRAINT "expedition_found_resources_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_found_resources" ADD CONSTRAINT "expedition_found_resources_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_members" ADD CONSTRAINT "expedition_members_expedition_id_fkey" FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expedition_members" ADD CONSTRAINT "expedition_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_logged_by_fkey" FOREIGN KEY ("logged_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person_status_log" ADD CONSTRAINT "person_status_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "person_status_log" ADD CONSTRAINT "person_status_log_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_profession_id_fkey" FOREIGN KEY ("profession_id") REFERENCES "professions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_from_profession_id_fkey" FOREIGN KEY ("from_profession_id") REFERENCES "professions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profession_reassignment_log" ADD CONSTRAINT "profession_reassignment_log_to_profession_id_fkey" FOREIGN KEY ("to_profession_id") REFERENCES "professions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "professions_resources_amounts" ADD CONSTRAINT "professions_resources_amounts_professions_id_fkey" FOREIGN KEY ("professions_id") REFERENCES "professions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "professions_resources_amounts" ADD CONSTRAINT "professions_resources_amounts_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_camp_id_fkey" FOREIGN KEY ("camp_id") REFERENCES "camps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
