-- Forensic 043/у: snapshot complications/comorbidities on diary revise.
-- БЫЛО: POST …/revise обновлял complications/comorbidities в visit_diaries,
-- но visit_diary_revisions не хранил previous_* — при правке подписанного
-- дневника терялся прежний текст осложнений и сопутствующих заболеваний.
ALTER TABLE visit_diary_revisions
  ADD COLUMN IF NOT EXISTS previous_complications TEXT,
  ADD COLUMN IF NOT EXISTS previous_comorbidities TEXT;
