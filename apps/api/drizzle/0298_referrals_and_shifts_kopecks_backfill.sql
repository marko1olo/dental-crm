-- 0298_referrals_and_shifts_kopecks_backfill.sql
-- Additive kopecks columns for referral_campaigns & patient_referrals + idempotent backfill for cash_box_shifts & payments.

ALTER TABLE referral_campaigns
	ADD COLUMN IF NOT EXISTS min_first_spend_threshold_kopecks BIGINT NOT NULL DEFAULT 150000;

UPDATE referral_campaigns
SET min_first_spend_threshold_kopecks = COALESCE(ROUND(min_first_spend_threshold_rub * 100)::bigint, 150000)
WHERE min_first_spend_threshold_kopecks IS DISTINCT FROM COALESCE(ROUND(min_first_spend_threshold_rub * 100)::bigint, 150000);

ALTER TABLE patient_referrals
	ADD COLUMN IF NOT EXISTS qualifying_amount_kopecks BIGINT;

UPDATE patient_referrals
SET qualifying_amount_kopecks = ROUND(qualifying_amount_rub * 100)::bigint
WHERE qualifying_amount_rub IS NOT NULL
	AND qualifying_amount_kopecks IS NULL;

-- Backfill cash_box_shifts kopecks columns missed in 0288_cash_box_shifts_kopecks.sql
UPDATE cash_box_shifts
SET
	start_balance_kopecks = CASE
		WHEN start_balance_rub IS NOT NULL AND (start_balance_kopecks = 0 AND start_balance_rub <> 0 OR ABS(start_balance_kopecks - ROUND(start_balance_rub * 100)::bigint) >= 100)
			THEN ROUND(start_balance_rub * 100)::bigint
		ELSE start_balance_kopecks
	END,
	income_total_kopecks = CASE
		WHEN income_total_rub IS NOT NULL AND (income_total_kopecks = 0 AND income_total_rub <> 0 OR ABS(income_total_kopecks - ROUND(income_total_rub * 100)::bigint) >= 100)
			THEN ROUND(income_total_rub * 100)::bigint
		ELSE income_total_kopecks
	END,
	expense_total_kopecks = CASE
		WHEN expense_total_rub IS NOT NULL AND (expense_total_kopecks = 0 AND expense_total_rub <> 0 OR ABS(expense_total_kopecks - ROUND(expense_total_rub * 100)::bigint) >= 100)
			THEN ROUND(expense_total_rub * 100)::bigint
		ELSE expense_total_kopecks
	END,
	closing_balance_kopecks = CASE
		WHEN closing_balance_rub IS NOT NULL AND closing_balance_kopecks IS NULL
			THEN ROUND(closing_balance_rub * 100)::bigint
		ELSE closing_balance_kopecks
	END
WHERE
	(start_balance_rub IS NOT NULL AND ((start_balance_kopecks = 0 AND start_balance_rub <> 0) OR ABS(start_balance_kopecks - ROUND(start_balance_rub * 100)::bigint) >= 100))
	OR (income_total_rub IS NOT NULL AND ((income_total_kopecks = 0 AND income_total_rub <> 0) OR ABS(income_total_kopecks - ROUND(income_total_rub * 100)::bigint) >= 100))
	OR (expense_total_rub IS NOT NULL AND ((expense_total_kopecks = 0 AND expense_total_rub <> 0) OR ABS(expense_total_kopecks - ROUND(expense_total_rub * 100)::bigint) >= 100))
	OR (closing_balance_rub IS NOT NULL AND closing_balance_kopecks IS NULL);

-- Backfill nullable payments.amount_kopecks from 0278_payments_amount_kopecks.sql
UPDATE payments
SET amount_kopecks = ROUND(amount_rub * 100)::bigint
WHERE amount_kopecks IS NULL
	AND amount_rub IS NOT NULL;
