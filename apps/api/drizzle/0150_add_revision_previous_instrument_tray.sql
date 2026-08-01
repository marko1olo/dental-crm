-- Forensic 043/у: snapshot instrument tray barcode on diary revise.
-- БЫЛО: sterilization/link 409 обещал правку лотка «через ревизию»,
-- но POST …/revise не принимал instrumentTrayBarcode и не писал
-- previous_* — неверный штрихкод в подписанной 043/у нельзя было
-- исправить с юридическим следом.
ALTER TABLE visit_diary_revisions
  ADD COLUMN IF NOT EXISTS previous_instrument_tray_barcode TEXT;
