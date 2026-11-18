ALTER TABLE "visit_diaries" ADD COLUMN IF NOT EXISTS "complaint" text;
ALTER TABLE "visit_diary_revisions" ADD COLUMN IF NOT EXISTS "previous_complaint" text;
