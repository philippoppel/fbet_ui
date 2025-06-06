-- AlterTable
ALTER TABLE "event_comments" ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "event_id" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

