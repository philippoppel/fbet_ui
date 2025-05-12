-- CreateTable
CREATE TABLE "event_comments" (
    "id" SERIAL NOT NULL,
    "text" TEXT,
    "gifUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
