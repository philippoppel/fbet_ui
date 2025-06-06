-- DropIndex
DROP INDEX "idx_group_active_streak";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "has_wildcard",
DROP COLUMN "wildcard_answer",
DROP COLUMN "wildcard_prompt",
DROP COLUMN "wildcard_type";

-- AlterTable
ALTER TABLE "tips" DROP COLUMN "wildcard_guess",
DROP COLUMN "wildcard_points";

-- AlterTable
ALTER TABLE "leadership_streaks" DROP COLUMN "endedOn",
ADD COLUMN     "ended_on" TIMESTAMP(3);

-- DropEnum
DROP TYPE "WildcardType";

-- CreateIndex
CREATE INDEX "idx_group_active_streak" ON "leadership_streaks"("group_id" ASC, "ended_on" ASC);

