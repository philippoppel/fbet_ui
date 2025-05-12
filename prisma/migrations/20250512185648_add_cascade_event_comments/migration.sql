-- DropForeignKey
ALTER TABLE "event_comments" DROP CONSTRAINT "event_comments_eventId_fkey";

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
