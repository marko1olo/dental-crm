-- Clinical Medical Forms: 043-1/u, 037/u-88, 039/u-88, radiation dose sheet
ALTER TYPE "document_kind" ADD VALUE IF NOT EXISTS 'orthodontic_medical_card_043_1u';
ALTER TYPE "document_kind" ADD VALUE IF NOT EXISTS 'daily_dentist_diary_037u';
ALTER TYPE "document_kind" ADD VALUE IF NOT EXISTS 'summary_dentist_statement_039u';
ALTER TYPE "document_kind" ADD VALUE IF NOT EXISTS 'radiation_dose_sheet';
