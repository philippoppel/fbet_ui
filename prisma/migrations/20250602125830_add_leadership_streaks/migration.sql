/*
  Warnings:

  - Made the column `userId` on table `event_comments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by_id` on table `events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_by_id` on table `groups` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `tips` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "event_comments" DROP CONSTRAINT "event_comments_userId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "group_memberships" DROP CONSTRAINT "group_memberships_user_id_fkey";

-- DropForeignKey
ALTER TABLE "groups" DROP CONSTRAINT "groups_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "tips" DROP CONSTRAINT "tips_user_id_fkey";

-- AlterTable
ALTER TABLE "event_comments" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "created_by_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "created_by_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tips" ALTER COLUMN "user_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
