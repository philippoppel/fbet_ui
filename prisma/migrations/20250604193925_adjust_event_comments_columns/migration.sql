-- Warnings from Prisma are important. This SQL attempts to address them carefully.
-- It assumes that columns "eventId", "gifUrl", "userId" (camelCase) might have existed
-- and should now map to "event_id", "gif_url", "user_id" (snake_case) respectively,
-- preserving data where possible.

-- Step 0: Drop original Foreign Keys if they point to the old camelCase column names
-- This is taken from your Prisma-generated SQL.
ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "event_comments_eventId_fkey";
ALTER TABLE "event_comments" DROP CONSTRAINT IF EXISTS "event_comments_userId_fkey";

-- Step 1: Rename existing columns to new mapped names IF THEY EXIST.
-- This preserves data if the columns only changed names (e.g. due to @map directive).
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='eventId') THEN
ALTER TABLE "event_comments" RENAME COLUMN "eventId" TO "event_id";
END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='userId') THEN
ALTER TABLE "event_comments" RENAME COLUMN "userId" TO "user_id";
END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='gifUrl') THEN
ALTER TABLE "event_comments" RENAME COLUMN "gifUrl" TO "gif_url";
END IF;
END $$;

-- Step 2: Add new columns or ensure types for potentially renamed columns.
-- Crucially, new required columns (user_id, event_id) are added as NULLABLE first
-- if they don't exist after the rename step. `updated_at` gets a default.

-- Add/Alter 'gif_url' (TEXT, nullable)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='gif_url') THEN
ALTER TABLE "event_comments" ADD COLUMN "gif_url" TEXT;
ELSE
        -- If it was renamed, ensure its type is TEXT. It's nullable by schema design (String?).
ALTER TABLE "event_comments" ALTER COLUMN "gif_url" TYPE TEXT,
ALTER COLUMN "gif_url" DROP NOT NULL; -- Ensure it's nullable
END IF;
END $$;

-- Add/Alter 'updated_at' (TIMESTAMP, NOT NULL with DEFAULT)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='updated_at') THEN
ALTER TABLE "event_comments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ELSE
        -- If it existed, ensure it's NOT NULL and set a default if it didn't have one.
        -- Populate existing NULLs before setting NOT NULL.
UPDATE "event_comments" SET "updated_at" = CURRENT_TIMESTAMP WHERE "updated_at" IS NULL;
ALTER TABLE "event_comments" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
END IF;
END $$;

-- Add/Alter 'user_id' (INTEGER, temporarily NULLABLE)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='user_id') THEN
ALTER TABLE "event_comments" ADD COLUMN "user_id" INTEGER; -- Add as nullable
ELSE
        -- If it was renamed, ensure its type is INTEGER and make it nullable for now.
ALTER TABLE "event_comments" ALTER COLUMN "user_id" TYPE INTEGER,
ALTER COLUMN "user_id" DROP NOT NULL; -- Temporarily allow NULLs
END IF;
END $$;

-- Add/Alter 'event_id' (INTEGER, temporarily NULLABLE)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='event_id') THEN
ALTER TABLE "event_comments" ADD COLUMN "event_id" INTEGER; -- Add as nullable
ELSE
        -- If it was renamed, ensure its type is INTEGER and make it nullable for now.
ALTER TABLE "event_comments" ALTER COLUMN "event_id" TYPE INTEGER,
ALTER COLUMN "event_id" DROP NOT NULL; -- Temporarily allow NULLs
END IF;
END $$;

-- Add 'likes_count' (INTEGER, NOT NULL with DEFAULT)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='event_comments' AND column_name='likes_count') THEN
ALTER TABLE "event_comments" ADD COLUMN "likes_count" INTEGER NOT NULL DEFAULT 0;
ELSE
        -- If it existed, ensure it's NOT NULL and has the default.
        -- Populate existing NULLs before setting NOT NULL.
UPDATE "event_comments" SET "likes_count" = 0 WHERE "likes_count" IS NULL;
ALTER TABLE "event_comments" ALTER COLUMN "likes_count" SET NOT NULL,
ALTER COLUMN "likes_count" SET DEFAULT 0;
END IF;
END $$;


-- Re-apply/update Foreign Key constraints for group_memberships and tips (from Prisma's generated SQL)
-- This ensures they have the desired CASCADE behavior.
ALTER TABLE "group_memberships" DROP CONSTRAINT IF EXISTS "group_memberships_user_id_fkey";
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tips" DROP CONSTRAINT IF EXISTS "tips_user_id_fkey";
ALTER TABLE "tips" ADD CONSTRAINT "tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Foreign Key constraints for event_comments.
-- These will be added to user_id and event_id which are currently (in this script) nullable.
-- This is generally fine; FKs can be on nullable columns.
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable for comment_likes (this is new, should be fine)
CREATE TABLE "comment_likes" (
                                 "id" SERIAL NOT NULL,
                                 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "user_id" INTEGER NOT NULL,
                                 "comment_id" INTEGER NOT NULL,

                                 CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for comment_likes (should be fine)
CREATE UNIQUE INDEX "comment_likes_user_id_comment_id_key" ON "comment_likes"("user_id", "comment_id");

-- AddForeignKey for comment_likes (should be fine)
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "event_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
WICHTIGE NÄCHSTE SCHRITTE NACH ANWENDUNG DIESER MIGRATION:

1.  Deine `event_comments`-Tabelle hat jetzt `user_id`- und `event_id`-Spalten, die für die
    existierenden 30 Zeilen möglicherweise `NULL` sind (oder die Werte aus den umbenannten
    camelCase-Spalten enthalten, FALLS diese existierten und Werte hatten).
    Dein `schema.prisma` erwartet diese Felder jedoch als nicht-nullbar (`Int`).

2.  DU MUSST MANUELL die Werte in den Spalten `user_id` und `event_id` für alle
    Zeilen in `event_comments` überprüfen und sicherstellen, dass sie gültige,
    nicht-`NULL`-Integer-Werte haben. Wenn sie nach der Umbenennung immer noch `NULL` sind
    oder falsche Werte haben, musst du sie korrigieren.
    Beispiel für eine manuelle SQL-Aktualisierung (führe dies direkt in deiner Datenbank aus):
    UPDATE "event_comments" SET "user_id" = DEIN_KORREKTER_WERT, "event_id" = DEIN_KORREKTER_WERT WHERE id = DEINE_KOMMENTAR_ID;
    (Wiederhole dies für alle betroffenen Zeilen, die `NULL`-Werte in `user_id` oder `event_id` haben.)

3.  Nachdem du sichergestellt hast, dass alle Zeilen in `event_comments` gültige, nicht-`NULL` Werte
    für `user_id` und `event_id` haben, erstelle und führe eine neue Prisma-Migration aus:
    Stelle sicher, dass dein `schema.prisma` `userId: Int` und `eventId: Int` (also nicht-nullbar) definiert.
    Dann führe aus:
    `npx prisma migrate dev --name make_event_comment_fks_non_nullable`

    Prisma wird erkennen, dass `user_id` und `event_id` in der Datenbank (durch diese Migration)
    potenziell nullbar sind, aber im Schema als nicht-nullbar definiert sind. Die neue Migration
    wird versuchen, die Spalten auf `NOT NULL` zu setzen. Dies wird erfolgreich sein, wenn du
    die Daten in Schritt 2 korrekt aufgefüllt hast.
*/