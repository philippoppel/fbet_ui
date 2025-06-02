-- CreateTable
CREATE TABLE "leadership_streaks" (
    "id" SERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "became_leader_on" TIMESTAMP(3) NOT NULL,
    "ended_on" TIMESTAMP(3),

    CONSTRAINT "leadership_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_group_active_streak" ON "leadership_streaks"("group_id", "ended_on");

-- CreateIndex
CREATE UNIQUE INDEX "leadership_streaks_group_id_user_id_became_leader_on_key" ON "leadership_streaks"("group_id", "user_id", "became_leader_on");

-- AddForeignKey
ALTER TABLE "leadership_streaks" ADD CONSTRAINT "leadership_streaks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership_streaks" ADD CONSTRAINT "leadership_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
