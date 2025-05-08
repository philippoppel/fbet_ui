-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_group_id_fkey";

-- DropForeignKey
ALTER TABLE "group_memberships" DROP CONSTRAINT "group_memberships_group_id_fkey";

-- DropForeignKey
ALTER TABLE "tips" DROP CONSTRAINT "tips_event_id_fkey";

-- AddForeignKey
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
