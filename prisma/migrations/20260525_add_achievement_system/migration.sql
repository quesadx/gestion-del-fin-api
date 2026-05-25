-- CreateTable achievement_roles
CREATE TABLE "achievement_role" (
    "achievement_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_role_pkey" PRIMARY KEY ("achievement_id","role_id")
);

-- CreateTable achievement_notifications
CREATE TABLE "achievement_notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "notification_sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable achievement_stats
CREATE TABLE "achievement_stat" (
    "id" SERIAL NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "total_unlocks" INTEGER NOT NULL DEFAULT 0,
    "unlock_rate" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    "average_unlock_days" INTEGER NOT NULL DEFAULT 0,
    "last_unlock_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "achievement_roles_role_id_idx" ON "achievement_role"("role_id");

-- CreateIndex
CREATE INDEX "achievement_notifications_unsent_idx" ON "achievement_notification"("notification_sent", "created_at");

-- CreateIndex
CREATE INDEX "achievement_notifications_user_id_idx" ON "achievement_notification"("user_id");

-- AddForeignKey
ALTER TABLE "achievement_role" ADD CONSTRAINT "achievement_role_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_role" ADD CONSTRAINT "achievement_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_notification" ADD CONSTRAINT "achievement_notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_notification" ADD CONSTRAINT "achievement_notification_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_stat" ADD CONSTRAINT "achievement_stat_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUnique
CREATE UNIQUE INDEX "uq_achievement_stats" ON "achievement_stat"("achievement_id");

-- AddConstraint (achievement_notifications unique)
CREATE UNIQUE INDEX "uq_achievement_notification" ON "achievement_notification"("user_id", "achievement_id", "created_at");
